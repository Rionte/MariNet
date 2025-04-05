export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: User;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  member_count: number;
  created_at: string;
}