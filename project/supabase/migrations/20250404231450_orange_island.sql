/*
  # Initial Schema for MariNet

  1. Tables
    - profiles (extends auth.users)
    - posts
    - groups
    - group_members
    - votes

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  image_url text,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  post_id uuid REFERENCES posts(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  vote_type boolean NOT NULL, -- true for upvote, false for downvote
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Groups are viewable by everyone"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Group creators can update groups"
  ON groups FOR UPDATE
  USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Group members are viewable by everyone"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can change their votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);