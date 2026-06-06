-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Create the Verses table for RAG
create table if not exists verses (
  id uuid primary key default gen_random_uuid(),
  religion text not null,   -- "hinduism", "christianity", or "islam"
  book text not null,       -- e.g., "gita", "bible", or "quran"
  chapter text,             -- e.g., "2", "Matthew 7"
  verse text,               -- e.g., "47", "12"
  content text not null,    -- The actual human-readable text of the verse
  embedding vector(384),    -- mathematical representation (local all-MiniLM-L6-v2 is 384 dimensions)
  transliteration text,
  meaning text,
  search_text text
);

-- 3. Create a function to search the nearest verses
create or replace function match_verses (
  filter_religion text,
  match_count int,
  match_threshold float,
  query_embedding float8[]
)
returns table (
  id uuid,
  book text,
  chapter text,
  verse text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    verses.id,
    verses.book,
    verses.chapter,
    verses.verse,
    verses.content,
    1 - (verses.embedding <=> query_embedding::vector(384)) as similarity
  from verses
  where verses.religion = filter_religion
    and 1 - (verses.embedding <=> query_embedding::vector(384)) > match_threshold
  order by verses.embedding <=> query_embedding::vector(384)
  limit match_count;
$$;

-- 4. Create the Chats table to save user histories
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null, -- Supabase automatic Auth linkage
  theme text not null,      -- "krishna", "bible", or "quran"
  messages jsonb not null default '[]'::jsonb, -- Array of chat messages
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Turn on Row Level Security (RLS) for Chats so users only see their own history!
alter table chats enable row level security;

create policy "Users can insert their own chats."
  on chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chats."
  on chats for update
  using (auth.uid() = user_id);

create policy "Users can see their own chats."
  on chats for select
  using (auth.uid() = user_id);
