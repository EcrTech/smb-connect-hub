import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2, Image as ImageIcon, Video, X, ArrowLeft, Search, Repeat2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { CommentsSection } from '@/components/member/CommentsSection';
import { EditPostDialog } from '@/components/member/EditPostDialog';
import { Input } from '@/components/ui/input';
import { SharePostDropdown } from '@/components/post/SharePostDropdown';
import { BookmarkButton } from '@/components/post/BookmarkButton';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  original_post_id: string | null;
  original_author_id: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  members: {
    company_id: string | null;
    companies: {
      name: string;
    } | null;
  };
  original_author?: {
    first_name: string;
    last_name: string;
    avatar: string | null;
  } | null;
  liked_by_user?: boolean;
}

export default function AssociationFeed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
    
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (postsData && postsData.length > 0) {
        const userIds = Array.from(new Set(postsData.map((post: any) => post.user_id)));
        const originalAuthorIds = Array.from(new Set(postsData.map((post: any) => post.original_author_id).filter(Boolean)));
        const allUserIds = Array.from(new Set([...userIds, ...originalAuthorIds]));

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar')
          .in('id', allUserIds);

        if (profilesError) throw profilesError;

        const profilesById = (profilesData || []).reduce((acc: Record<string, any>, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);

        const postsWithDetails = await Promise.all(
          postsData.map(async (post: any) => {
            const profile = profilesById[post.user_id] || null;

            const { data: memberData } = await supabase
              .from('members')
              .select('company_id, companies (name)')
              .eq('user_id', post.user_id)
              .maybeSingle();

            const { data: likeData } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();

            return {
              ...post,
              profiles: profile,
              members: memberData,
              original_author: post.original_author_id ? profilesById[post.original_author_id] : null,
              liked_by_user: !!likeData,
            };
          })
        );

        setPosts(postsWithDetails as any);
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);

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

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !imageFile && !videoFile) return;

    setPosting(true);
    try {
      let imageUrl = null;
      let videoUrl = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      if (videoFile) {
        videoUrl = await uploadImage(videoFile); // Same upload function works for videos
      }

      const { error } = await supabase
        .from('posts')
        .insert([{ 
          content: newPost.trim(), 
          user_id: currentUserId, 
          image_url: imageUrl,
          video_url: videoUrl,
        }]);

      if (error) throw error;

      setNewPost('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoPreview(null);
      toast({
        title: 'Success',
        description: 'Post created successfully',
      });
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

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('posts')
            .update({ likes_count: Math.max(0, post.likes_count - 1) })
            .eq('id', postId);
        }
      } else {
        await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: currentUserId }]);

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

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post deleted successfully',
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

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
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

  const handleCommentAdded = async () => {
    await loadPosts();
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const authorName = post.profiles 
      ? `${post.profiles.first_name} ${post.profiles.last_name}`.toLowerCase()
      : 'unknown user';
    const content = post.content.toLowerCase();
    return authorName.includes(query) || content.includes(query);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 pl-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/association')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold">Association Feed</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pl-20 max-w-2xl">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search posts or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <Textarea
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="mb-4 resize-none"
              rows={3}
            />
            {imagePreview && (
              <div className="relative mb-4">
                <img src={imagePreview} alt="Preview" className="rounded-lg max-h-64 w-full object-cover" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {videoPreview && (
              <div className="relative mb-4">
                <video src={videoPreview} controls className="rounded-lg max-h-64 w-full" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeVideo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button variant="outline" size="sm" type="button" asChild title="Add photo (max 10MB)">
                    <span className="cursor-pointer">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Photo
                    </span>
                  </Button>
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload">
                  <Button variant="outline" size="sm" type="button" asChild title="Add video (max 50MB, MP4/WebM/MOV)">
                    <span className="cursor-pointer">
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </span>
                  </Button>
                </label>
              </div>
              <Button onClick={handleCreatePost} disabled={(!newPost.trim() && !imageFile && !videoFile) || posting}>
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No posts found matching your search' : 'No posts yet. Be the first to share something!'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  {post.original_post_id && post.original_author && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <Repeat2 className="w-4 h-4" />
                      <span>
                        <span className="font-semibold">{post.profiles?.first_name} {post.profiles?.last_name}</span>
                        {' '}reposted{' '}
                        <span className="font-semibold">{post.original_author.first_name} {post.original_author.last_name}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar 
                      className="cursor-pointer"
                      onClick={() => navigate(`/profile/${post.original_author_id || post.user_id}`)}
                    >
                      <AvatarImage src={post.original_author?.avatar || post.profiles?.avatar || undefined} />
                      <AvatarFallback>
                        {post.original_author ? 
                          `${post.original_author.first_name?.[0] || '?'}${post.original_author.last_name?.[0] || '?'}` :
                          `${post.profiles?.first_name?.[0] || '?'}${post.profiles?.last_name?.[0] || '?'}`
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p 
                            className="font-semibold cursor-pointer hover:underline"
                            onClick={() => navigate(`/profile/${post.original_author_id || post.user_id}`)}
                          >
                            {post.original_author ? 
                              `${post.original_author.first_name || 'Unknown'} ${post.original_author.last_name || 'User'}` :
                              `${post.profiles?.first_name || 'Unknown'} ${post.profiles?.last_name || 'User'}`
                            }
                          </p>
                          {post.members?.companies && !post.original_post_id && (
                            <p className="text-sm text-muted-foreground">
                              {post.members.companies.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {post.user_id === currentUserId && (
                          <div className="flex gap-2">
                            <EditPostDialog
                              postId={post.id}
                              initialContent={post.content}
                              onSave={loadPosts}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(post.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img 
                          src={post.image_url} 
                          alt="Post" 
                          className="mt-3 rounded-lg max-h-96 w-full object-cover" 
                        />
                      )}
                      {post.video_url && (
                        <video 
                          src={post.video_url} 
                          controls
                          className="mt-3 rounded-lg max-h-96 w-full" 
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post.liked_by_user || false)}
                      className={post.liked_by_user ? 'text-red-500' : ''}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${post.liked_by_user ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {post.comments_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRepost(post)}
                    >
                      <Repeat2 className="w-4 h-4 mr-2" />
                      Repost
                    </Button>
                    <SharePostDropdown
                      postId={post.id}
                      postContent={post.content}
                      sharesCount={post.shares_count || 0}
                      onShareComplete={loadPosts}
                    />
                    <BookmarkButton postId={post.id} userId={currentUserId} />
                  </div>

                  {showComments[post.id] && (
                    <div className="mt-4 pt-4 border-t">
                      <CommentsSection 
                        postId={post.id}
                        currentUserId={currentUserId}
                        onCommentAdded={handleCommentAdded}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
