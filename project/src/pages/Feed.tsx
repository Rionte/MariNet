import React, { useState, useEffect } from 'react';
import { Image, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  upvotes: number;
  downvotes: number;
  user: {
    username: string;
    avatar_url: string;
  };
};

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPostLoading, setIsPostLoading] = useState(true);
  
  useEffect(() => {
    fetchPosts();
  }, []);
  
  const fetchPosts = async () => {
    setIsPostLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, 
          content, 
          image_url, 
          created_at, 
          user_id,
          upvotes,
          downvotes,
          user:profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsPostLoading(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to post');
      return;
    }
    
    if (!content.trim() && !image) {
      toast.error('Post cannot be empty');
      return;
    }
    
    if (content.length > 900) {
      toast.error('Post cannot exceed 900 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `posts/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, image, {
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
            },
          });
          
        if (uploadError) throw uploadError;
        
        imageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post-images/${filePath}`;
      }
      
      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content,
            image_url: imageUrl,
            user_id: user.id,
            upvotes: 0,
            downvotes: 0,
          },
        ]);
        
      if (postError) throw postError;
      
      toast.success('Post created successfully');
      setContent('');
      setImage(null);
      setUploadProgress(0);
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }
    
    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if same type
          await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);
          
          // Update post vote count
          await supabase
            .from('posts')
            .update({
              [voteType === 'upvote' ? 'upvotes' : 'downvotes']: supabase.rpc('decrement', { x: 1 }),
            })
            .eq('id', postId);
        } else {
          // Change vote type
          await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          
          // Update post vote counts
          await supabase
            .from('posts')
            .update({
              [voteType === 'upvote' ? 'upvotes' : 'downvotes']: supabase.rpc('increment', { x: 1 }),
              [voteType === 'upvote' ? 'downvotes' : 'upvotes']: supabase.rpc('decrement', { x: 1 }),
            })
            .eq('id', postId);
        }
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
              vote_type: voteType,
            },
          ]);
        
        // Update post vote count
        await supabase
          .from('posts')
          .update({
            [voteType === 'upvote' ? 'upvotes' : 'downvotes']: supabase.rpc('increment', { x: 1 }),
          })
          .eq('id', postId);
      }
      
      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {user && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="What's happening?"
              rows={3}
              maxLength={900}
            />
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center">
                <label className="cursor-pointer flex items-center text-blue-500 hover:text-blue-600">
                  <Image className="w-5 h-5 mr-1" />
                  <span className="text-sm">Add Image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                {image && (
                  <span className="ml-2 text-sm text-gray-500">
                    {image.name.length > 20 
                      ? `${image.name.substring(0, 20)}...` 
                      : image.name}
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-3">
                  {content.length}/900
                </span>
                <button
                  type="submit"
                  disabled={loading || content.length > 900}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploading image: {uploadProgress}%</p>
              </div>
            )}
          </form>
        </div>
      )}

      {isPostLoading ? (
        <div className="bg-white p-8 rounded-lg shadow flex justify-center">
          <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="flex items-start mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mr-3 bg-gray-200">
                {post.user?.avatar_url ? (
                  <img src={post.user.avatar_url} alt={post.user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                    {post.user?.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold">{post.user?.username}</p>
                <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
              </div>
            </div>
            <p className="mb-3 whitespace-pre-line">{post.content}</p>
            {post.image_url && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img src={post.image_url} alt="Post" className="w-full object-contain max-h-96" />
              </div>
            )}
            <div className="flex items-center mt-2">
              <button 
                onClick={() => handleVote(post.id, 'upvote')}
                className="flex items-center text-gray-500 hover:text-blue-500 mr-4"
              >
                <ThumbsUp className="w-5 h-5 mr-1" />
                <span>{post.upvotes}</span>
              </button>
              <button 
                onClick={() => handleVote(post.id, 'downvote')}
                className="flex items-center text-gray-500 hover:text-red-500"
              >
                <ThumbsDown className="w-5 h-5 mr-1" />
                <span>{post.downvotes}</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
} 