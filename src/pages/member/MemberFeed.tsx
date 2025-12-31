import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { CommentsSection } from '@/components/member/CommentsSection';
import { EditPostDialog } from '@/components/member/EditPostDialog';
import { FloatingChat } from '@/components/messages/FloatingChat';
import { MemberOnboarding } from '@/components/onboarding/MemberOnboarding';
import { RoleNavigation } from '@/components/RoleNavigation';

import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Send,
  Trash2,
  Building2,
  LogOut,
  Settings,
  Image as ImageIcon,
  Video,
  X,
  Search,
  MessageSquare,
  Users,
  Calendar,
  UserPlus,
  Repeat2,
  Bookmark
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/BackButton';
import { SharePostDropdown } from '@/components/post/SharePostDropdown';
import { BookmarkButton } from '@/components/post/BookmarkButton';
import { PostEngagementBadge } from '@/components/post/PostEngagementBadge';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  reposts_count: number;
  created_at: string;
  user_id: string;
  original_post_id: string | null;
  original_author_id: string | null;
  profile: {
    first_name: string;
    last_name: string;
    avatar: string | null;
    headline: string | null;
  };
  original_author?: {
    first_name: string;
    last_name: string;
    avatar: string | null;
  } | null;
  member: {
    company: {
      name: string;
    } | null;
  } | null;
  user_liked: boolean;
}

interface Association {
  id: string;
  name: string;
  logo: string | null;
}

export default function MemberFeed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [associations, setAssociations] = useState<Association[]>([]);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    loadPosts();
    loadPendingConnectionsCount();

    // Set up real-time subscription for posts (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Update post counts in place without full reload
            setPosts(prev => prev.map(post => 
              post.id === payload.new.id 
                ? { 
                    ...post, 
                    likes_count: payload.new.likes_count ?? post.likes_count,
                    comments_count: payload.new.comments_count ?? post.comments_count,
                    shares_count: payload.new.shares_count ?? post.shares_count,
                    reposts_count: payload.new.reposts_count ?? post.reposts_count
                  } 
                : post
            ));
          } else {
            // For INSERT and DELETE, reload all posts
            loadPosts();
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for connections
    const connectionsChannel = supabase
      .channel('connections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        () => {
          loadPendingConnectionsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(connectionsChannel);
    };
  }, []);

  const loadPendingConnectionsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the current user's member ID
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) return;

      // Count pending connection requests where user is the receiver
      const { count } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', memberData.id)
        .eq('status', 'pending');

      setPendingConnectionsCount(count || 0);
    } catch (error) {
      console.error('Error loading pending connections count:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Load user's associations
      const associationIds = new Set<string>();
      
      // Get associations where user is a manager
      const { data: managerData } = await supabase
        .from('association_managers')
        .select('association_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      managerData?.forEach(m => associationIds.add(m.association_id));

      // Get associations through company membership
      const { data: memberData } = await supabase
        .from('members')
        .select('company_id, companies!inner(association_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      memberData?.forEach(m => {
        const company = m.companies as any;
        if (company?.association_id) {
          associationIds.add(company.association_id);
        }
      });

      // Fetch association details
      if (associationIds.size > 0) {
        const { data: associationsData } = await supabase
          .from('associations')
          .select('id, name, logo')
          .in('id', Array.from(associationIds))
          .eq('is_active', true)
          .order('name');
        
        setAssociations(associationsData || []);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Get unique user IDs including original authors
      const userIds = Array.from(new Set(postsData.map((post: any) => post.user_id)));
      const originalAuthorIds = Array.from(new Set(postsData.map((post: any) => post.original_author_id).filter(Boolean)));
      const allUserIds = Array.from(new Set([...userIds, ...originalAuthorIds]));

      // Batch fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar, headline')
        .in('id', allUserIds);

      const profilesById = (profilesData || []).reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Load profile and member data for each post
      const postsWithProfiles = await Promise.all(
        postsData.map(async (post) => {
          const profileData = profilesById[post.user_id] || { first_name: '', last_name: '', avatar: null, headline: null };

          const { data: memberData } = await supabase
            .from('members')
            .select('company:companies(name)')
            .eq('user_id', post.user_id)
            .maybeSingle();

          return {
            ...post,
            profile: profileData,
            original_author: post.original_author_id ? profilesById[post.original_author_id] : null,
            member: memberData
          };
        })
      );

      // Check if user liked each post
      if (user) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

        const postsWithLikeStatus = postsWithProfiles.map(post => ({
          ...post,
          user_liked: likedPostIds.has(post.id)
        }));

        setPosts(postsWithLikeStatus);
      } else {
        const postsWithDefaults = postsWithProfiles.map(post => ({
          ...post,
          user_liked: false
        }));
        setPosts(postsWithDefaults);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let imageUrl = null;
      let videoUrl = null;

      // Upload image if present
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/post-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Upload video if present
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}/video-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post created',
      });
      setNewPostContent('');
      setImagePreview(null);
      setImageFile(null);
      setVideoPreview(null);
      setVideoFile(null);
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate post image upload (10MB limit)
    const { validatePostImageUpload } = await import('@/lib/uploadValidation');
    const validation = await validatePostImageUpload(file);
    
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    // Clear video if selecting image
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video upload (50MB limit)
    const { validateVideoUpload } = await import('@/lib/uploadValidation');
    const validation = validateVideoUpload(file);
    
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    // Clear image if selecting video
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    setVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const toggleComments = (postId: string) => {
    const newShowComments = new Set(showComments);
    if (newShowComments.has(postId)) {
      newShowComments.delete(postId);
    } else {
      newShowComments.add(postId);
    }
    setShowComments(newShowComments);
  };

  const handleLikePost = async (postId: string, currentlyLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        // Update likes count
        const post = posts.find(p => p.id === postId);
        if (post && post.likes_count > 0) {
          await supabase
            .from('posts')
            .update({ likes_count: post.likes_count - 1 })
            .eq('id', postId);
        }
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        // Update likes count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('posts')
            .update({ likes_count: post.likes_count + 1 })
            .eq('id', postId);
        }
      }

      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post deleted',
      });
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  const handleRepost = async (post: Post) => {
    if (post.user_id === currentUserId) {
      toast({
        title: 'Cannot repost',
        description: 'You cannot repost your own post',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          content: post.content,
          image_url: post.image_url,
          video_url: post.video_url,
          user_id: currentUserId,
          original_post_id: post.original_post_id || post.id,
          original_author_id: post.original_author_id || post.user_id,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post reposted successfully',
      });
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to repost',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Success',
        description: 'You have been logged out',
      });
      navigate('/auth/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <MemberOnboarding />
      <div className="min-h-screen bg-background">
      {/* Header - LinkedIn style */}
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left - Back Button & Search */}
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <BackButton fallbackPath="/dashboard" variant="ghost" size="icon" label="" />
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 bg-muted/50"
                  />
                </div>
              </div>
            </div>

            {/* Right - Navigation Icons */}
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/feed')}
                data-tour="feed"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Feed</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/members')}
                data-tour="browse-members"
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Members</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3 relative"
                onClick={() => navigate('/connections')}
                data-tour="connections"
              >
                <div className="relative">
                  <UserPlus className="w-5 h-5" />
                  {pendingConnectionsCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                    >
                      {pendingConnectionsCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs">Connections</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/messages')}
                data-tour="messages"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">Messages</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/calendar')}
                data-tour="calendar"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs">Calendar</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/companies')}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-xs">Companies</span>
              </Button>
              
              {/* Profile Dropdown */}
              <div className="flex items-center gap-2 border-l pl-4">
                {profile && currentUserId && (
                  <Avatar 
                    className="cursor-pointer hover:ring-2 hover:ring-primary transition-all w-8 h-8" 
                    onClick={() => navigate(`/profile/${currentUserId}`)}
                  >
                    <AvatarImage src={profile.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate('/account-settings')}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pl-20 max-w-3xl">
        <RoleNavigation />
        
        {/* Associated Associations Ribbon */}
        {associations.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center gap-3 overflow-x-auto">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Your Associations:</span>
                <div className="flex items-center gap-3">
                  {associations.map((association) => (
                    <div
                      key={association.id}
                      onClick={() => navigate(`/member/associations/${association.id}`)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {association.logo ? (
                        <img 
                          src={association.logo} 
                          alt={association.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{association.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Create Post Card */}
        <Card className="mb-6">
          <CardContent className="pt-6 pb-4">
            <div className="flex gap-3 mb-4">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={profile?.avatar || undefined} />
                <AvatarFallback>
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-h-[80px]">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="resize-none border-0 focus-visible:ring-0 px-3 py-2 placeholder:text-muted-foreground w-full"
                />
              </div>
            </div>
            
            {imagePreview && (
              <div className="relative mb-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="rounded-lg max-h-64 w-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {videoPreview && (
              <div className="relative mb-4">
                <video
                  src={videoPreview}
                  controls
                  className="rounded-lg max-h-64 w-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeVideo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground hover:bg-transparent"
                  title="Add photo (max 10MB)"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Photo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground hover:bg-transparent"
                  title="Add video (max 50MB, MP4/WebM/MOV)"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Video
                </Button>
              </div>
              <Button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || posting}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">No posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts
              .filter(post => {
                if (!searchTerm) return true;
                const searchLower = searchTerm.toLowerCase();
                const fullName = `${post.profile.first_name} ${post.profile.last_name}`.toLowerCase();
                return post.content.toLowerCase().includes(searchLower) ||
                       fullName.includes(searchLower);
              })
              .map((post) => {
              const fullName = `${post.profile.first_name} ${post.profile.last_name}`;
              const initials = `${post.profile.first_name[0]}${post.profile.last_name[0]}`;
              const isOwnPost = post.user_id === currentUserId;

              return (
                <Card key={post.id}>
                  <CardContent className="pt-6">
                    {/* Engagement badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Repost indicator */}
                        {post.original_post_id && post.original_author && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Repeat2 className="w-4 h-4" />
                            <span>
                              <span className="font-semibold">{post.profile.first_name} {post.profile.last_name}</span>
                              {' '}reposted{' '}
                              <span className="font-semibold">{post.original_author.first_name} {post.original_author.last_name}</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <PostEngagementBadge 
                        likesCount={post.likes_count || 0}
                        commentsCount={post.comments_count || 0}
                        sharesCount={post.shares_count || 0}
                        repostsCount={post.reposts_count || 0}
                      />
                    </div>
                    <div className="flex gap-4">
                      <Avatar 
                        className="cursor-pointer"
                        onClick={() => navigate(`/profile/${post.original_author_id || post.user_id}`)}
                      >
                        <AvatarImage src={post.original_author?.avatar || post.profile.avatar || undefined} />
                        <AvatarFallback>
                          {post.original_author ? 
                            `${post.original_author.first_name?.[0] || '?'}${post.original_author.last_name?.[0] || '?'}` :
                            initials
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 
                              className="font-semibold hover:underline cursor-pointer"
                              onClick={() => navigate(`/profile/${post.original_author_id || post.user_id}`)}
                            >
                              {post.original_author ? 
                                `${post.original_author.first_name} ${post.original_author.last_name}` :
                                fullName
                              }
                            </h3>
                            {!post.original_post_id && post.profile.headline && (
                              <p className="text-sm text-muted-foreground">
                                {post.profile.headline}
                              </p>
                            )}
                            {!post.original_post_id && post.member?.company && (
                              <p className="text-sm text-muted-foreground">
                                {post.member.company.name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {isOwnPost && (
                              <>
                                <EditPostDialog
                                  postId={post.id}
                                  initialContent={post.content}
                                  onSave={loadPosts}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="mt-4 whitespace-pre-wrap">{post.content}</p>

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post"
                            className="mt-4 rounded-lg max-h-96 w-full object-cover"
                          />
                        )}

                        {post.video_url && (
                          <video
                            src={post.video_url}
                            controls
                            className="mt-4 rounded-lg max-h-96 w-full"
                          />
                        )}

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikePost(post.id, post.user_liked)}
                            className={post.user_liked ? 'text-red-500' : ''}
                          >
                            <Heart className={`w-4 h-4 mr-2 ${post.user_liked ? 'fill-current' : ''}`} />
                            {post.likes_count > 0 && post.likes_count}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleComments(post.id)}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {post.comments_count > 0 && post.comments_count}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRepost(post)}
                          >
                            <Repeat2 className="w-4 h-4 mr-2" />
                            {post.reposts_count > 0 && post.reposts_count}
                          </Button>
                          <SharePostDropdown
                            postId={post.id}
                            postContent={post.content}
                            sharesCount={post.shares_count || 0}
                            onShareComplete={loadPosts}
                          />
                          <BookmarkButton postId={post.id} userId={currentUserId} />
                        </div>

                        {/* Comments Section */}
                        {showComments.has(post.id) && (
                          <CommentsSection
                            postId={post.id}
                            currentUserId={currentUserId}
                            onCommentAdded={loadPosts}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Chat Widget */}
      <FloatingChat currentUserId={currentUserId} />
    </div>
    </>
  );
}