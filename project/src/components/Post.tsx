import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Post as PostType } from '../types';

interface PostProps {
  post: PostType;
}

export default function Post({ post }: PostProps) {
  return (
    <div className="p-4 border-b hover:bg-gray-50">
      <div className="flex gap-3">
        <img
          src={post.user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.username}`}
          alt={post.user.username}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{post.user.username}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-2 text-gray-900">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post attachment"
              className="mt-3 rounded-lg max-h-96 object-cover"
            />
          )}
          <div className="mt-3 flex items-center gap-4">
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500">
              <ChevronUp className="w-5 h-5" />
              <span>{post.upvotes}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-red-500">
              <ChevronDown className="w-5 h-5" />
              <span>{post.downvotes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}