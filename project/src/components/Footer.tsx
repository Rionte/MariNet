import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram, BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">MariNet</h2>
            </div>
            <p className="text-sm text-gray-600">
              Connect with your school community through a modern social platform designed for students and educators.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">Home</Link></li>
              <li><Link to="/groups" className="text-gray-600 hover:text-blue-600 transition-colors">Groups</Link></li>
              <li><Link to="/ai-tutor" className="text-gray-600 hover:text-blue-600 transition-colors">AI Tutor</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" aria-label="GitHub">
                <Github className="h-5 w-5 text-gray-700" />
              </a>
              <a href="#" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5 text-gray-700" />
              </a>
              <a href="#" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5 text-gray-700" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} MariNet. All rights reserved.
          </p>
          <div className="text-sm text-gray-500 flex items-center mt-4 md:mt-0">
            Made with <Heart className="h-4 w-4 text-red-500 mx-1" /> for education
          </div>
        </div>
      </div>
    </footer>
  );
} 