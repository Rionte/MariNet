import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import Footer from '../components/Footer';
import { Home, Users, Bell, LogOut, User, Settings, BookOpen, BrainCircuit } from 'lucide-react';

// Navigation links with icons
const navLinks = [
  { to: '/', label: 'Home', icon: <Home className="w-6 h-6" /> },
  { to: '/groups', label: 'Groups', icon: <Users className="w-6 h-6" /> },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-6 h-6" /> },
  { to: '/ai-tutor', label: 'AI Tutor', icon: <BrainCircuit className="w-6 h-6" /> }
];

export default function MainLayout() {
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Navigate to="/login" />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar - fixed width */}
      <div className="fixed inset-y-0 left-0 z-20 w-72">
        <Sidebar />
      </div>

      {/* Right sidebar (hidden on smaller screens) */}
      <div className="fixed inset-y-0 right-0 z-20 hidden xl:block w-80 shadow-sm">
        <RightSidebar />
      </div>

      {/* Main content with proper margins for sidebars */}
      <div className="flex flex-col flex-1 ml-72 xl:mr-80">
        {/* Main content area */}
        <main className="flex-grow container mx-auto px-6 py-6 max-w-4xl">
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}