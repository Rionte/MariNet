// User type
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

// Auth type
export interface Auth {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; data: any }>;
} 