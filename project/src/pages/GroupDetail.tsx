import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Image, ThumbsUp, ThumbsDown, Users, Settings, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

type Group = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  member_count: number;
};

type GroupWithCreator = Group & {
  creator: {
    username: string;
    id: string;
  };
};

type Member = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  upvotes: number;
  downvotes: number;
  group_id: string;
  user: {
    username: string;
    avatar_url: string;
  };
};

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithCreator | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');

  useEffect(() => {
    if (id) {
      fetchGroup();
      fetchGroupMembers();
      fetchGroupPosts();
    }
  }, [id]);

  const fetchGroup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator:profiles(username, id)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setGroup(data as GroupWithCreator);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupMembers = async () => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          user:profiles(username, avatar_url)
        `)
        .eq('group_id', id)
        .order('role', { ascending: false });
      
      if (error) throw error;
      setMembers(data as Member[]);
      
      // Check if current user is a member
      if (user) {
        const userMembership = data.find((member: any) => member.user_id === user.id);
        setIsMember(!!userMembership);
        setIsAdmin(userMembership?.role === 'admin');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchGroupPosts = async () => {
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles(username, avatar_url)
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) {
      toast.error('You must be logged in to join a group');
      return;
    }
    
    try {
      // Add user as a member
      const { error } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: id,
            user_id: user.id,
            role: 'member',
          },
        ]);
        
      if (error) throw error;
      
      // Update group member count
      const { error: updateError } = await supabase
        .from('groups')
        .update({ member_count: supabase.rpc('increment', { x: 1 }) })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      toast.success('Joined group successfully');
      fetchGroup();
      fetchGroupMembers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !isMember) return;
    
    try {
      // Remove user from members
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update group member count
      const { error: updateError } = await supabase
        .from('groups')
        .update({ member_count: supabase.rpc('decrement', { x: 1 }) })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      toast.success('Left group successfully');
      setIsMember(false);
      setIsAdmin(false);
      fetchGroup();
      fetchGroupMembers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave group');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };
  
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to post');
      return;
    }
    
    if (!isMember) {
      toast.error('You must be a member to post in this group');
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
    
    setPosting(true);
    
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
            group_id: id,
            upvotes: 0,
            downvotes: 0,
          },
        ]);
        
      if (postError) throw postError;
      
      toast.success('Post created successfully');
      setContent('');
      setImage(null);
      setUploadProgress(0);
      fetchGroupPosts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setPosting(false);
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
      
      fetchGroupPosts();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow flex justify-center">
          <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">Group not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="bg-blue-100 h-48 rounded-t-lg flex items-center justify-center">
          {group.image_url ? (
            <img 
              src={group.image_url} 
              alt={group.name} 
              className="w-full h-full object-cover rounded-t-lg" 
            />
          ) : (
            <Users className="w-20 h-20 text-blue-500" />
          )}
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">{group.name}</h1>
              <p className="text-gray-500 mt-1">
                Created by {group.creator?.username || 'Unknown'} on {formatDate(group.created_at)}
              </p>
              <p className="text-gray-500 mt-1">
                <span className="font-medium">{group.member_count}</span> {group.member_count === 1 ? 'member' : 'members'}
              </p>
            </div>
            <div>
              {isMember ? (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleLeaveGroup}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full"
                  >
                    Leave Group
                  </button>
                  {isAdmin && (
                    <Link 
                      to={`/groups/${id}/settings`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full flex items-center"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </Link>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleJoinGroup}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Join Group
                </button>
              )}
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">{group.description || 'No description provided.'}</p>
          
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 border-b-2 font-medium ${
                  activeTab === 'posts' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 border-b-2 font-medium ${
                  activeTab === 'members' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Members
              </button>
            </div>
          </div>
          
          {activeTab === 'posts' && (
            <div>
              {isMember && (
                <div className="mb-6">
                  <form onSubmit={handlePostSubmit}>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Share something with the group..."
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
                          disabled={posting || content.length > 900}
                          className="px-4 py-2 bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                        >
                          {posting ? 'Posting...' : 'Post'}
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
              
              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No posts in this group yet.
                  {isMember && " Be the first to post something!"}
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
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
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'members' && (
            <div>
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((member) => (
                    <Link 
                      to={`/profile/${member.user_id}`} 
                      key={member.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 mr-3 bg-gray-200">
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt={member.user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                            {member.user?.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.user?.username}</p>
                        <div className="flex items-center">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                            {member.role}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            Joined {formatDate(member.joined_at)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 