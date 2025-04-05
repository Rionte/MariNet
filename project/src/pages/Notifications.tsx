import React from 'react';

export default function Notifications() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">You have no new notifications.</p>
      </div>
    </div>
  );
} 