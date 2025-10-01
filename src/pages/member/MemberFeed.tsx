import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Send,
  Trash2,
  Building2,
  LogOut
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    loadProfile();
    loadPosts();
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

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post created',
      });
      setNewPostContent('');
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
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SMB Connect</h1>
              <p className="text-sm text-muted-foreground">Member Feed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && currentUserId && (
              <Avatar 
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
                onClick={() => navigate(`/profile/${currentUserId}`)}
              >
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback>
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Create Post */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src={profile?.avatar || undefined} />
                <AvatarFallback>
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || posting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {posting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
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
            {posts.map((post) => {
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
                          {isOwnPost && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {post.comments_count > 0 && post.comments_count}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}