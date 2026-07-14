-- SQL DDL for bible_diaries

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    surname TEXT,
    address TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    bio TEXT,
    favorite_verse TEXT,
    spiritual_journey TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop profiles policies if they exist
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- Recreate profiles policies
CREATE POLICY "Allow public read access to profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow users to update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create trigger to automatically create a profile when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, first_name, surname, address, phone_number, avatar_url, bio, favorite_verse, spiritual_journey)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'first_name') || ' ' || (new.raw_user_meta_data->>'surname'), 'New Member'),
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'surname',
        new.raw_user_meta_data->>'address',
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'bio',
        new.raw_user_meta_data->>'favorite_verse',
        new.raw_user_meta_data->>'spiritual_journey'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Create diaries (posts) table
CREATE TABLE IF NOT EXISTS public.diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on diaries
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;

-- Drop diaries policies if they exist
DROP POLICY IF EXISTS "Allow public read access to diaries" ON public.diaries;
DROP POLICY IF EXISTS "Allow users to insert their own diaries" ON public.diaries;
DROP POLICY IF EXISTS "Allow users to delete their own diaries" ON public.diaries;

-- Recreate diaries policies
CREATE POLICY "Allow public read access to diaries"
    ON public.diaries FOR SELECT
    USING (true);

CREATE POLICY "Allow users to insert their own diaries"
    ON public.diaries FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow users to delete their own diaries"
    ON public.diaries FOR DELETE
    USING (auth.uid() = author_id);


-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
    post_id UUID REFERENCES public.diaries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Enable RLS on likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Drop likes policies if they exist
DROP POLICY IF EXISTS "Allow public read access to likes" ON public.likes;
DROP POLICY IF EXISTS "Allow users to insert their own likes" ON public.likes;
DROP POLICY IF EXISTS "Allow users to delete their own likes" ON public.likes;

-- Recreate likes policies
CREATE POLICY "Allow public read access to likes"
    ON public.likes FOR SELECT
    USING (true);

CREATE POLICY "Allow users to insert their own likes"
    ON public.likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own likes"
    ON public.likes FOR DELETE
    USING (auth.uid() = user_id);


-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.diaries(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop comments policies if they exist
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
DROP POLICY IF EXISTS "Allow users to insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.comments;

-- Recreate comments policies
CREATE POLICY "Allow public read access to comments"
    ON public.comments FOR SELECT
    USING (true);

CREATE POLICY "Allow users to insert their own comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow users to delete their own comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = author_id);


-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    post_id UUID REFERENCES public.diaries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Enable RLS on favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop favorites policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Allow users to insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Allow users to delete their own favorites" ON public.favorites;

-- Recreate favorites policies
CREATE POLICY "Allow users to read their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);


-- Create chats table (direct messages)
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Drop chats policies if they exist
DROP POLICY IF EXISTS "Allow users to read chats they are involved in" ON public.chats;
DROP POLICY IF EXISTS "Allow users to insert their own sent chats" ON public.chats;

-- Recreate chats policies
CREATE POLICY "Allow users to read chats they are involved in"
    ON public.chats FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Allow users to insert their own sent chats"
    ON public.chats FOR INSERT
    WITH CHECK (auth.uid() = sender_id);
