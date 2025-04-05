import { useState, useEffect } from 'react';
import { supabase } from '../lib/localDB';
import type { User, Auth } from '../types';

export function useAuth(): Auth {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First check if there's an existing session
    const checkSession = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
          // If there's a session, get the user profile
          const { data: profileData } = await supabase
            .from('marinet_profiles')
            .select('*')
            .eq('id', sessionData.session.user.id)
            .single();
          
          if (profileData) {
            setUser(profileData as User);
          }
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Run the session check
    checkSession();

    // Set up auth state listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('marinet_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser(profile as User);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { 
    user, 
    loading,
    signIn: async (email: string, password: string) => {
      setLoading(true);
      const result = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      return result;
    },
    signOut: async () => {
      setLoading(true);
      const result = await supabase.auth.signOut();
      setLoading(false);
      return result;
    },
    signUp: async (email: string, password: string, username: string) => {
      setLoading(true);
      
      // Create auth user
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error || !data.user) {
        setLoading(false);
        return { error, data };
      }
      
      // Create profile
      const profileResult = await supabase
        .from('marinet_profiles')
        .insert([
          {
            id: data.user.id,
            username,
            email,
            avatar_url: '',
            created_at: new Date().toISOString(),
          },
        ]);
      
      setLoading(false);
      
      if (profileResult.error) {
        return { error: profileResult.error, data: null };
      }
      
      return { data, error: null };
    }
  };
}