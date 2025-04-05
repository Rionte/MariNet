import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
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
  };
};

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithCreator[]>([]);
  const [myGroups, setMyGroups] = useState<GroupWithCreator[]>([]);
  const [popularGroups, setPopularGroups] = useState<GroupWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Get all groups
      const { data: allGroups, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          creator:profiles(username)
        `)
        .order('created_at', { ascending: false });
      
      if (groupsError) throw groupsError;
      
      // Set all groups
      setGroups(allGroups as GroupWithCreator[]);
      
      // Set popular groups (sorted by member count)
      const sortedByPopularity = [...allGroups].sort((a, b) => b.member_count - a.member_count);
      setPopularGroups(sortedByPopularity.slice(0, 5) as GroupWithCreator[]);
      
      if (user) {
        // Get groups I'm a member of
        const { data: memberGroups, error: memberError } = await supabase
          .from('group_members')
          .select(`
            group_id
          `)
          .eq('user_id', user.id);
          
        if (memberError) throw memberError;
        
        // Filter all groups to only the ones I'm a member of
        const myGroupIds = memberGroups.map(g => g.group_id);
        const filteredMyGroups = allGroups.filter(g => myGroupIds.includes(g.id));
        setMyGroups(filteredMyGroups as GroupWithCreator[]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a group');
      return;
    }
    
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    
    setCreating(true);
    
    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([
          {
            name,
            description,
            created_by: user.id,
            member_count: 1, // Creator is the first member
          },
        ])
        .select()
        .single();
        
      if (groupError) throw groupError;
      
      // Add creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: group.id,
            user_id: user.id,
            role: 'admin',
          },
        ]);
        
      if (memberError) throw memberError;
      
      toast.success('Group created successfully');
      setName('');
      setDescription('');
      setIsModalOpen(false);
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-3/4">
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Groups</h1>
              {user && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Group
                </button>
              )}
            </div>
            
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 w-full p-2 border border-gray-300 rounded-md"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="loader rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                No groups found. Create one?
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGroups.map((group) => (
                  <Link 
                    to={`/groups/${group.id}`} 
                    key={group.id}
                    className="block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="h-32 bg-blue-100 flex items-center justify-center">
                      {group.image_url ? (
                        <img 
                          src={group.image_url} 
                          alt={group.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Users className="w-12 h-12 text-blue-500" />
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="text-lg font-bold text-gray-800 mb-1">{group.name}</h2>
                      <p className="text-gray-500 text-sm mb-2">
                        Created by {group.creator?.username || 'Unknown'} on {formatDate(group.created_at)}
                      </p>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {group.description || 'No description available.'}
                      </p>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-1/4">
          {user && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-bold mb-4">My Groups</h2>
              {myGroups.length === 0 ? (
                <p className="text-gray-500 text-sm">You haven't joined any groups yet.</p>
              ) : (
                <div className="space-y-3">
                  {myGroups.map((group) => (
                    <Link 
                      to={`/groups/${group.id}`} 
                      key={group.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                    >
                      <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                        {group.image_url ? (
                          <img 
                            src={group.image_url} 
                            alt={group.name} 
                            className="w-full h-full object-cover rounded-md" 
                          />
                        ) : (
                          <Users className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{group.name}</h3>
                        <p className="text-xs text-gray-500">{group.member_count} members</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">Popular Groups</h2>
            {popularGroups.length === 0 ? (
              <p className="text-gray-500 text-sm">No popular groups yet.</p>
            ) : (
              <div className="space-y-3">
                {popularGroups.map((group) => (
                  <Link 
                    to={`/groups/${group.id}`} 
                    key={group.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md"
                  >
                    <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                      {group.image_url ? (
                        <img 
                          src={group.image_url} 
                          alt={group.name} 
                          className="w-full h-full object-cover rounded-md" 
                        />
                      ) : (
                        <Users className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{group.name}</h3>
                      <p className="text-xs text-gray-500">{group.member_count} members</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Create a New Group</h2>
            <form onSubmit={createGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name*
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter group name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md h-24"
                  placeholder="What is this group about?"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 