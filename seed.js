const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value.trim();
      } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        supabaseAnonKey = value.trim();
      }
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project')) {
  console.error('Error: Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  // Create authenticated clients for Elijah and Grace to satisfy RLS policies
  const elijahClient = createClient(supabaseUrl, supabaseAnonKey);
  const graceClient = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Authenticating Elijah Bennett...');
  const { data: elijahSignIn, error: elijahSignInError } = await elijahClient.auth.signInWithPassword({
    email: 'elijah.bennett@gmail.com',
    password: 'password'
  });

  if (elijahSignInError) {
    console.error('Failed to log in Elijah client:', elijahSignInError.message);
    process.exit(1);
  }
  const elijahId = elijahSignIn.user.id;
  console.log('Elijah client authenticated!');

  console.log('Authenticating Grace Taylor...');
  const { data: graceSignIn, error: graceSignInError } = await graceClient.auth.signInWithPassword({
    email: 'grace.taylor@gmail.com',
    password: 'password'
  });

  if (graceSignInError) {
    console.error('Failed to log in Grace client:', graceSignInError.message);
    process.exit(1);
  }
  const graceId = graceSignIn.user.id;
  console.log('Grace client authenticated!');

  // Clear existing diaries
  console.log('Cleaning up previous seed posts...');
  // We can delete using any client as they are deleting their own diaries
  await elijahClient.from('diaries').delete().eq('author_id', elijahId);
  await graceClient.from('diaries').delete().eq('author_id', graceId);

  // Insert diaries using their respective authenticated clients
  console.log('Seeding Elijah\'s reflections...');
  const { data: elijahPosts, error: elijahPostsError } = await elijahClient.from('diaries').insert([
    {
      author_id: elijahId,
      content: 'Remember that God\'s timing is always perfect. Even when the road ahead looks uncertain, He has already cleared the path. Lean on Him today.',
      category: 'Faith'
    },
    {
      author_id: elijahId,
      content: 'He gives strength to the weary and increases the power of the weak. Isaiah 40:29. Praying this over everyone who reads this today.',
      category: 'Strength'
    }
  ]).select();

  if (elijahPostsError) {
    console.error('Failed to seed Elijah diaries:', elijahPostsError.message);
    process.exit(1);
  }

  console.log('Seeding Grace\'s reflections...');
  const { data: gracePosts, error: gracePostsError } = await graceClient.from('diaries').insert([
    {
      author_id: graceId,
      content: 'Reflecting on the beauty of grace this morning. It isn\'t something we earn; it is a free gift. Let\'s extend that same grace to those we meet today.',
      category: 'Love'
    },
    {
      author_id: graceId,
      content: 'May the God of hope fill you with all joy and peace as you trust in Him, so that you may overflow with hope by the power of the Holy Spirit. Romans 15:13.',
      category: 'Hope'
    }
  ]).select();

  if (gracePostsError) {
    console.error('Failed to seed Grace diaries:', gracePostsError.message);
    process.exit(1);
  }

  console.log('Seeding comments...');
  const post1 = elijahPosts.find(p => p.content.includes('timing is always perfect'));
  if (post1) {
    // Grace comments on Elijah's post using Grace's client
    const { error: commentError } = await graceClient.from('comments').insert([
      {
        post_id: post1.id,
        author_id: graceId,
        content: 'This was exactly what I needed to read this morning. Thank you, Elijah!'
      }
    ]);
    if (commentError) {
      console.error('Failed to seed comment:', commentError.message);
    } else {
      console.log('Successfully seeded comments!');
    }
  }

  console.log('Seeding completed successfully!');
}

seed();
