import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit, Image, ThumbsUp, ThumbsDown, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  email: string;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  upvotes: number;
  downvotes: number;
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [id]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // Get profile by ID
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setUsername(data.username);
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
      
      // Check if profile is owned by current user
      if (user && user.id === id) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    setIsPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsPostsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleUpdateProfile = async () => {
    if (!isOwner) return;
    
    try {
      let newAvatarUrl = avatarUrl;
      
      // Upload new avatar if selected
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatar, {
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
            },
          });
          
        if (uploadError) throw uploadError;
        
        newAvatarUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: newAvatarUrl,
        })
        .eq('id', user?.id);
        
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
      
      fetchUserPosts();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow flex justify-center">
          <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="bg-blue-100 h-32 rounded-t-lg"></div>
        <div className="px-6 pb-6">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-gray-200">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={profile.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer">
                  <Image className="w-5 h-5" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>
            {isOwner && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="mt-16 px-4 py-2 bg-blue-500 text-white rounded-full flex items-center"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit Profile
              </button>
            )}
            {isEditing && (
              <div className="mt-16 flex space-x-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full"
                >
                  Save
                </button>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            {isEditing ? (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-2xl font-bold w-full p-2 border border-gray-300 rounded-md"
                placeholder="Username"
              />
            ) : (
              <h1 className="text-2xl font-bold">{profile.username}</h1>
            )}
            
            <div className="flex flex-wrap items-center text-gray-500 mt-2">
              <div className="flex items-center mr-4">
                <Mail className="w-4 h-4 mr-1" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
          
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md h-24"
              placeholder="Tell us about yourself..."
            />
          ) : (
            <p className="mb-4 text-gray-700">{profile.bio || 'No bio yet.'}</p>
          )}
          
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
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Posts</h2>
      
      {isPostsLoading ? (
        <div className="bg-white p-8 rounded-lg shadow flex justify-center">
          <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No posts yet.</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="flex items-start mb-3">
              <div className="flex-1">
                <p className="font-bold">{profile.username}</p>
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