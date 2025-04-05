import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': []
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setImage(acceptedFiles[0]);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      let imageUrl;
      if (image) {
        const { data, error } = await supabase.storage
          .from('post-images')
          .upload(`${Date.now()}-${image.name}`, image);
        
        if (error) throw error;
        imageUrl = data.path;
      }

      const { error } = await supabase.from('posts').insert({
        content,
        image_url: imageUrl,
      });

      if (error) throw error;

      setContent('');
      setImage(null);
      toast.success('Post created!');
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b">
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={900}
        />
        <div className="mt-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              {...getRootProps()}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full"
            >
              <input {...getInputProps()} />
              <ImageIcon className="w-6 h-6 text-blue-500" />
            </div>
            {image && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{image.name}</span>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
}