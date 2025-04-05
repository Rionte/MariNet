import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { supabase } from '../lib/localDB';

type Group = {
  id: string;
  name: string;
  image_url: string | null;
  member_count: number;
};

export default function RightSidebar() {
  const [popularGroups, setPopularGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar_url: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchPopularGroups();
  }, []);

  const fetchPopularGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marinet_groups')
        .select('id, name, image_url, member_count')
        .order('member_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPopularGroups(data as Group[] || []);
    } catch (error) {
      console.error('Error fetching popular groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('marinet_profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data as { id: string; username: string; avatar_url: string }[] || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="h-screen bg-white border-l border-gray-200 p-4 overflow-y-auto">
      {/* Search */}
      <div className="mb-6 relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full p-2 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search users..."
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-white shadow-lg rounded-lg border border-gray-200 absolute z-50 left-0 right-0">
            {searchResults.map((user) => (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-medium">{user.username}</span>
              </Link>
            ))}
          </div>
        )}

        {searching && searchTerm && (
          <div className="mt-2 text-sm text-gray-500 text-center">Searching...</div>
        )}
      </div>

      {/* Popular Groups */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="font-bold text-lg">Popular Groups</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : popularGroups.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-2">No groups yet</p>
        ) : (
          <div className="space-y-3">
            {popularGroups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
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

      {/* About */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="font-bold text-lg mb-2">About MariNet</h2>
        <p className="text-sm text-gray-600 mb-3">
          MariNet is a school social platform designed to connect students, share resources, and collaborate on projects.
        </p>
        <div className="text-xs text-gray-500">
          <p>© {new Date().getFullYear()} MariNet</p>
          <p>All rights reserved</p>
        </div>
      </div>
    </div>
  );
} 