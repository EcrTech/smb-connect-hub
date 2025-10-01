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
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Send,
  Trash2,
  Building2,
  LogOut,
  Image as ImageIcon,
  X,
  Search,
  MessageSquare,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import logo from '@/assets/smb-connect-logo.jpg';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profile: {
    first_name: string;
    last_name: string;
    avatar: string | null;
    headline: string | null;
  };
  member: {
    company: {
      name: string;
    } | null;
  } | null;
  user_liked: boolean;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    loadPosts();

    // Set up real-time subscription for new posts
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      // Load profile and member data for each post
      const postsWithProfiles = await Promise.all(
        postsData.map(async (post) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar, headline')
            .eq('id', post.user_id)
            .maybeSingle();

          const { data: memberData } = await supabase
            .from('members')
            .select('company:companies(name)')
            .eq('user_id', post.user_id)
            .maybeSingle();

          return {
            ...post,
            profile: profileData || { first_name: '', last_name: '', avatar: null, headline: null },
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

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post created',
      });
      setNewPostContent('');
      setImagePreview(null);
      setImageFile(null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div className="min-h-screen bg-background">
      {/* Header - LinkedIn style */}
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left - Logo and Search */}
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <img 
                src={logo} 
                alt="SMB Connect" 
                className="h-8 object-contain cursor-pointer" 
                onClick={() => navigate('/feed')}
              />
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
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Feed</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/members')}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Members</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                onClick={() => navigate('/messages')}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">Messages</span>
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
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Create Post Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar || undefined} />
                <AvatarFallback>
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="resize-none border-0 focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
                />
              </div>
            </div>
            
            {imagePreview && (
              <div className="relative mt-3 ml-15">
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

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Photo
              </Button>
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
          <p className="text-center text-muted-foreground">Loading posts...</p>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
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
                    <div className="flex gap-4">
                      <Avatar 
                        className="cursor-pointer"
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                      >
                        <AvatarImage src={post.profile.avatar || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 
                              className="font-semibold hover:underline cursor-pointer"
                              onClick={() => navigate(`/profile/${post.user_id}`)}
                            >
                              {fullName}
                            </h3>
                            {post.profile.headline && (
                              <p className="text-sm text-muted-foreground">
                                {post.profile.headline}
                              </p>
                            )}
                            {post.member?.company && (
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

                        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
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
  );
}