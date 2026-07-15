require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We need the service role key to bypass RLS and execute raw SQL, but we don't have it.
// However, since we can't execute raw SQL via the standard JS client without a custom RPC,
// I will output the SQL for the user to run in their Supabase dashboard, OR
// if the user has a setup where we can run psql, we could do that.
// But wait! If we don't have a way to run SQL directly, how did we create the tables originally?
// The user created them by pasting schema.sql into the dashboard.

console.log("Please run the following SQL in your Supabase SQL Editor to update the RLS policies:");
console.log(`
-- 1. UPDATE policy for diaries (so users can edit their posts)
DROP POLICY IF EXISTS "Allow users to update their own diaries" ON public.diaries;
CREATE POLICY "Allow users to update their own diaries"
    ON public.diaries FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 2. UPDATE policy for comments (so users can edit their comments)
DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.comments;
CREATE POLICY "Allow users to update their own comments"
    ON public.comments FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 3. Fix DELETE and INSERT policies for likes to explicitly apply to authenticated users
DROP POLICY IF EXISTS "Allow users to delete their own likes" ON public.likes;
CREATE POLICY "Allow users to delete their own likes"
    ON public.likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own likes" ON public.likes;
CREATE POLICY "Allow users to insert their own likes"
    ON public.likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 4. Fix INSERT and DELETE policies for comments to explicitly apply to authenticated users
DROP POLICY IF EXISTS "Allow users to insert their own comments" ON public.comments;
CREATE POLICY "Allow users to insert their own comments"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow post author or commentor to delete comment" ON public.comments;
CREATE POLICY "Allow post author or commentor to delete comment"
    ON public.comments FOR DELETE
    TO authenticated
    USING (
        auth.uid() = author_id 
        OR auth.uid() IN (SELECT author_id FROM public.diaries WHERE id = post_id)
    );
`);
