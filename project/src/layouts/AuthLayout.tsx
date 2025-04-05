import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-blue-600">MariNet</h1>
          </div>
        </div>
        <div className="max-w-md mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}