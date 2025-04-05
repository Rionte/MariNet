import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Bell, LogOut, User, Settings, BrainCircuit, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Navigation links with icons
const navLinks = [
  { to: '/', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { to: '/groups', label: 'Groups', icon: <Users className="w-5 h-5" /> },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { to: '/ai-tutor', label: 'AI Tutor', icon: <BrainCircuit className="w-5 h-5" /> }
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col border-r border-gray-200 shadow-sm">
      {/* Logo header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">MariNet</h1>
            <p className="text-xs text-gray-500">School Social Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm border-l-4 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                {link.icon}
              </div>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User profile & actions */}
      <div className="p-4 border-t border-gray-100">
        {user && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{user.username}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <span>Settings</span>
          </NavLink>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
} 