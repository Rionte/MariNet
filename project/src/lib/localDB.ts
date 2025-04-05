import type { User } from '../types';

// Database tables
const DB_TABLES = {
  users: 'marinet_users',
  profiles: 'marinet_profiles',
  posts: 'marinet_posts',
  groups: 'marinet_groups',
  groupMembers: 'marinet_group_members',
  votes: 'marinet_votes'
};

// Current session user
let currentUser: User | null = null;
let authListeners: Array<(user: User | null) => void> = [];

// Initialize database with sample data if it doesn't exist
const initializeDB = () => {
  // Check if DB is already initialized
  if (localStorage.getItem('marinet_initialized')) {
    return;
  }

  // Create empty tables
  Object.values(DB_TABLES).forEach(table => {
    if (!localStorage.getItem(table)) {
      localStorage.setItem(table, JSON.stringify([]));
    }
  });

  // Create admin user
  const adminUser: User = {
    id: 'admin-user-1',
    username: 'Admin User',
    email: 'admin@marinet.edu',
    created_at: new Date().toISOString(),
    avatar_url: ''
  };

  // Create auth user
  const authUser = {
    id: adminUser.id,
    email: adminUser.email,
    password: 'admin123'
  };
  
  // Add auth user
  insert(DB_TABLES.users, authUser);

  // Add admin user to profiles
  insert(DB_TABLES.profiles, adminUser);

  // Create sample groups
  const sampleGroups = [
    {
      id: 'group-1',
      name: 'Math Club',
      description: 'A group for math enthusiasts to discuss problems and share solutions.',
      created_by: adminUser.id,
      member_count: 1,
      created_at: new Date().toISOString(),
      image_url: null
    },
    {
      id: 'group-2',
      name: 'Science Club',
      description: 'Discuss scientific discoveries, experiments, and theories.',
      created_by: adminUser.id,
      member_count: 1,
      created_at: new Date().toISOString(),
      image_url: null
    },
    {
      id: 'group-3',
      name: 'Literature Society',
      description: 'Analyze books, poetry, and other literary works.',
      created_by: adminUser.id,
      member_count: 1,
      created_at: new Date().toISOString(),
      image_url: null
    }
  ];

  // Add groups to groups table
  sampleGroups.forEach(group => insert(DB_TABLES.groups, group));

  // Add admin as member of each group
  sampleGroups.forEach(group => {
    insert(DB_TABLES.groupMembers, {
      id: `member-${group.id}-${adminUser.id}`,
      group_id: group.id,
      user_id: adminUser.id,
      role: 'admin',
      joined_at: new Date().toISOString()
    });
  });

  // Create sample posts
  const samplePosts = [
    {
      id: 'post-1',
      content: 'Welcome to MariNet! This is a social platform for schools.',
      user_id: adminUser.id,
      created_at: new Date().toISOString(),
      image_url: null,
      upvotes: 5,
      downvotes: 0,
      group_id: null
    },
    {
      id: 'post-2',
      content: 'Join our Math Club for exciting problem-solving sessions!',
      user_id: adminUser.id,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      image_url: null,
      upvotes: 3,
      downvotes: 0,
      group_id: 'group-1'
    }
  ];

  // Add posts to posts table
  samplePosts.forEach(post => insert(DB_TABLES.posts, post));
  
  // Mark as initialized
  localStorage.setItem('marinet_initialized', 'true');
};

// Get all data from a table
const select = <T>(table: string, query?: Partial<T>): T[] => {
  const data = JSON.parse(localStorage.getItem(table) || '[]');
  
  if (!query) {
    return data;
  }
  
  // Filter based on query
  return data.filter((item: T) => {
    for (const key in query) {
      if (item[key as keyof T] !== query[key as keyof T]) {
        return false;
      }
    }
    return true;
  });
};

// Get a single item from a table
const selectSingle = <T>(table: string, query: Partial<T>): T | null => {
  const results = select<T>(table, query);
  return results.length > 0 ? results[0] : null;
};

// Insert data into a table
const insert = <T>(table: string, data: T): { data: T, error: null } => {
  const tableData = JSON.parse(localStorage.getItem(table) || '[]');
  tableData.push(data);
  localStorage.setItem(table, JSON.stringify(tableData));
  return { data, error: null };
};

// Update data in a table
const update = <T>(table: string, data: Partial<T>, query: Partial<T>): { data: T[], error: null } => {
  const tableData = JSON.parse(localStorage.getItem(table) || '[]');
  const updatedData = tableData.map((item: T) => {
    let matches = true;
    
    for (const key in query) {
      if (item[key as keyof T] !== query[key as keyof T]) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return { ...item, ...data };
    }
    
    return item;
  });
  
  localStorage.setItem(table, JSON.stringify(updatedData));
  
  // Return updated items
  return { 
    data: updatedData.filter((item: T) => {
      for (const key in query) {
        if (item[key as keyof T] !== query[key as keyof T]) {
          return false;
        }
      }
      return true;
    }), 
    error: null 
  };
};

// Delete data from a table
const remove = <T>(table: string, query: Partial<T>): { error: null } => {
  const tableData = JSON.parse(localStorage.getItem(table) || '[]');
  const filteredData = tableData.filter((item: T) => {
    for (const key in query) {
      if (item[key as keyof T] === query[key as keyof T]) {
        return false;
      }
    }
    return true;
  });
  
  localStorage.setItem(table, JSON.stringify(filteredData));
  return { error: null };
};

// Authentication functions
const auth = {
  // Sign up
  signUp: async (credentials: { email: string, password: string }) => {
    // Check if user exists
    const users = select<{ email: string, password: string, id?: string }>(DB_TABLES.users, { email: credentials.email });
    
    if (users.length > 0) {
      return { error: { message: 'User already exists' }, data: null };
    }
    
    // Generate user ID
    const userId = `user-${Date.now()}`;
    
    // Create auth user
    const authUser = {
      id: userId,
      email: credentials.email,
      password: credentials.password
    };
    
    // Save auth user
    insert(DB_TABLES.users, authUser);
    
    return {
      data: {
        user: {
          id: userId,
          email: credentials.email
        }
      },
      error: null
    };
  },
  
  // Sign in
  signInWithPassword: async (credentials: { email: string, password: string }) => {
    // Find user
    const user = selectSingle<{ id: string, email: string, password: string }>(
      DB_TABLES.users, 
      { email: credentials.email }
    );
    
    if (!user) {
      return { error: { message: 'User not found' }, data: null };
    }
    
    if (user.password !== credentials.password) {
      return { error: { message: 'Invalid password' }, data: null };
    }
    
    // Get user profile
    const profile = selectSingle<User>(DB_TABLES.profiles, { id: user.id });
    
    if (profile) {
      // Set current user
      currentUser = profile;
      
      // Notify listeners
      authListeners.forEach(listener => listener(profile));
      
      // Store session
      localStorage.setItem('marinet_session', JSON.stringify({ user: profile }));
    }
    
    return { data: { user }, error: null };
  },
  
  // Sign out
  signOut: async () => {
    // Clear current user
    currentUser = null;
    
    // Notify listeners
    authListeners.forEach(listener => listener(null));
    
    // Clear session
    localStorage.removeItem('marinet_session');
    
    return { error: null };
  },
  
  // Get current session
  getSession: async () => {
    const session = localStorage.getItem('marinet_session');
    
    if (!session) {
      return { data: { session: null }, error: null };
    }
    
    return { data: JSON.parse(session), error: null };
  },
  
  // Get current user
  getUser: async () => {
    const session = localStorage.getItem('marinet_session');
    
    if (!session) {
      return { data: { user: null }, error: null };
    }
    
    const { user } = JSON.parse(session);
    return { data: { user }, error: null };
  },
  
  // On auth state change
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const listener = (user: User | null) => {
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', { user });
    };
    
    authListeners.push(listener);
    
    // Check current session
    const session = localStorage.getItem('marinet_session');
    if (session) {
      const { user } = JSON.parse(session);
      currentUser = user;
      listener(user);
    }
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners = authListeners.filter(l => l !== listener);
          }
        }
      }
    };
  },
  
  // Update user
  updateUser: async (updates: { email?: string, password?: string, username?: string, avatar_url?: string }) => {
    if (!currentUser) {
      return { error: { message: 'No user is currently signed in' }, data: null };
    }
    
    // Update auth user with explicit type casting
    update<any>(DB_TABLES.users, { 
      email: updates.email,
      password: updates.password
    }, { id: currentUser.id });
    
    // Update profile if username or avatar_url is included
    if (updates.username || updates.avatar_url) {
      update<User>(DB_TABLES.profiles, {
        username: updates.username,
        avatar_url: updates.avatar_url
      }, { id: currentUser.id });
      
      // Update the current user object
      if (updates.username) currentUser.username = updates.username;
      if (updates.avatar_url) currentUser.avatar_url = updates.avatar_url;
    }
    
    // Update session if any user data changed
    if (updates.email || updates.username || updates.avatar_url) {
      if (updates.email) currentUser.email = updates.email;
      
      localStorage.setItem('marinet_session', JSON.stringify({ user: currentUser }));
      
      // Notify listeners
      authListeners.forEach(listener => listener(currentUser));
    }
    
    return { data: { user: currentUser }, error: null };
  }
};

// RPC Helpers
const rpc = {
  increment: (args: { x: number }) => args.x + 1,
  decrement: (args: { x: number }) => Math.max(0, args.x - 1)
};

// Storage functions (simplified)
const storage = {
  from: (bucket: string) => ({
    upload: (path: string, file: File, options?: any) => {
      // In real implementation, this would upload to a server
      // For now, we'll just simulate success
      if (options?.onUploadProgress) {
        // Simulate upload progress
        const total = file.size;
        const chunks = 10;
        const chunkSize = total / chunks;
        
        for (let i = 1; i <= chunks; i++) {
          setTimeout(() => {
            options.onUploadProgress({
              loaded: i * chunkSize,
              total
            });
          }, i * 300);
        }
      }
      
      return { error: null, data: { path } };
    }
  })
};

// Initialize on import
initializeDB();

// Type definitions for better type checking
interface TableItem {
  [key: string]: any;
}

// Export the local database API
export const localDB = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        single: () => {
          const results = select(table, { [column]: value });
          return { data: results[0] || null, error: null };
        },
        order: (column: string, { ascending }: { ascending: boolean }) => {
          let results = select<TableItem>(table, { [column]: value });
          
          results.sort((a, b) => {
            if (ascending) {
              return a[column] < b[column] ? -1 : 1;
            } else {
              return a[column] > b[column] ? -1 : 1;
            }
          });
          
          return { data: results, error: null };
        },
        limit: (limit: number) => {
          const results = select(table, { [column]: value }).slice(0, limit);
          return { data: results, error: null };
        }
      }),
      order: (column: string, { ascending }: { ascending: boolean }) => {
        let results = select<TableItem>(table);
        
        results.sort((a, b) => {
          if (ascending) {
            return a[column] < b[column] ? -1 : 1;
          } else {
            return a[column] > b[column] ? -1 : 1;
          }
        });
        
        return { 
          limit: (limit: number) => {
            return { data: results.slice(0, limit), error: null };
          },
          data: results, 
          error: null 
        };
      },
      limit: (limit: number) => {
        const results = select(table).slice(0, limit);
        return { data: results, error: null };
      },
      ilike: (column: string, value: string) => {
        // Case-insensitive search using includes
        const searchValue = value.replace(/%/g, '').toLowerCase();
        
        const results = select<TableItem>(table).filter(item => {
          const itemValue = String(item[column]).toLowerCase();
          return itemValue.includes(searchValue);
        });
        
        return {
          limit: (limit: number) => ({ data: results.slice(0, limit), error: null }),
          data: results,
          error: null
        };
      }
    }),
    insert: (data: any) => insert(table, Array.isArray(data) ? data[0] : data),
    update: (data: any) => ({
      eq: (column: string, value: any) => update(table, data, { [column]: value })
    }),
    delete: () => ({
      eq: (column: string, value: any) => remove(table, { [column]: value })
    })
  }),
  auth,
  storage,
  rpc
};

// Replace supabase with localDB
export const supabase = localDB;

// Helper function to wait a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API function to simulate network requests
const mockFetch = async (url: string, options?: any): Promise<any> => {
  console.log(`Mock fetch: ${options?.method || 'GET'} ${url}`);
  
  // Simulate network delay
  await wait(Math.random() * 500 + 300);
  
  // For Settings/Profile API calls
  if (url.includes('/profile') || url.includes('/settings')) {
    let userId = url.split('/').pop();
    
    // If URL doesn't contain a user ID or it's invalid, use current user ID
    if (!userId || userId === 'undefined' || userId === 'settings') {
      userId = currentUser?.id;
      
      // If still no user ID, return error
      if (!userId) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Not authenticated or no user ID provided' }),
          text: async () => JSON.stringify({ error: 'Not authenticated or no user ID provided' })
        };
      }
    }
    
    const profile = selectSingle<User>(DB_TABLES.profiles, { id: userId });
    
    if (!profile) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Profile not found' }),
        text: async () => JSON.stringify({ error: 'Profile not found' })
      };
    }
    
    return {
      ok: true,
      json: async () => ({ data: profile }),
      // Text method for compatibility
      text: async () => JSON.stringify({ data: profile })
    };
  }
  
  // For Post creation
  if ((url.includes('/posts') || url.includes('/post')) && options?.method === 'POST') {
    try {
      const postData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      const newPost = insert(DB_TABLES.posts, {
        id: `post-${Date.now()}`,
        ...postData,
        created_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0
      });
      
      return {
        ok: true,
        json: async () => ({ data: newPost.data }),
        text: async () => JSON.stringify({ data: newPost.data })
      };
    } catch (error) {
      console.error('Error parsing post data:', error);
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request data' }),
        text: async () => JSON.stringify({ error: 'Invalid request data' })
      };
    }
  }
  
  // Add more mock endpoints as needed
  
  // Default response for unhandled requests
  return {
    ok: true,
    json: async () => ({ data: { message: 'Mock API response' } }),
    text: async () => JSON.stringify({ data: { message: 'Mock API response' } })
  };
};

// Override global fetch for development
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  try {
    // Special case for Gemini API - let it go through normally
    if (input.toString().includes('generativelanguage.googleapis.com')) {
      return originalFetch(input, init);
    }
    
    // For all other requests, use mock implementation
    console.log('Using mock fetch for:', input.toString());
    return mockFetch(input.toString(), init);
  } catch (error) {
    console.warn('Network request failed, using mock response:', error);
    // If real fetch fails, use mock fetch
    return mockFetch(input.toString(), init);
  }
}; 