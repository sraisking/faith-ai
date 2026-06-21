-- 1. Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create the Verses table for RAG
CREATE TABLE IF NOT EXISTS verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  religion TEXT NOT NULL,   -- "hinduism", "christianity", or "islam"
  book TEXT NOT NULL,       -- e.g., "gita", "bible", or "quran"
  chapter TEXT,             -- e.g., "2", "Matthew 7"
  verse TEXT,               -- e.g., "47", "12"
  content TEXT NOT NULL,    -- The actual human-readable text of the verse
  embedding VECTOR(384),    -- mathematical representation (Azure OpenAI text-embedding-3-small configured to 384 dimensions)
  transliteration TEXT,
  meaning TEXT,
  search_text TEXT
);

-- 4. Create index for faster vector similarity search
-- Azure PostgreSQL supports HNSW indexes for pgvector
CREATE INDEX IF NOT EXISTS verses_embedding_cosine_idx ON verses USING hnsw (embedding vector_cosine_ops);

-- 5. Create a function to search the nearest verses
CREATE OR REPLACE FUNCTION match_verses (
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT,
  filter_religion TEXT
)
RETURNS TABLE (
  id UUID,
  book TEXT,
  chapter TEXT,
  verse TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    verses.id,
    verses.book,
    verses.chapter,
    verses.verse,
    verses.content,
    1 - (verses.embedding <=> query_embedding) AS similarity
  from verses
  WHERE verses.religion = filter_religion
    AND 1 - (verses.embedding <=> query_embedding) > match_threshold
  ORDER BY verses.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. Create the Chats table to save user histories
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT NOT NULL,      -- "krishna", "bible", or "quran"
  messages JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of chat messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
