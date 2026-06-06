# Ingest Script Preparation

The ingest script (`scripts/ingest.mjs`) is now prepared and ready to run.

## Prerequisites

1. **Supabase Setup**: Ensure you have a Supabase project set up and the database schema created using `supabase/setup.sql`.

2. **Environment Variables**: Update `.env.local` with your actual Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (not the anon key)

3. **Install Dependencies**: Run `npm install @xenova/transformers` to install the local transformer library.

4. **Data Files**: Prepare JSON files containing the religious texts in the following format:
   ```json
   [
     {
       "book": "bible|krishna|quran",
       "chapter": "chapter_number_or_name",
       "verse": "verse_number",
       "content": "the text content"
     }
   ]
   ```

## Running the Ingest Script

From the `backend` folder:

```bash
cd backend
node scripts/ingest.mjs ../full_gita_dataset.json
node scripts/ingest.mjs ../full_quran_dataset.json
node scripts/ingest.mjs ../full_bible_dataset.json
```

Or ingest an entire directory of dataset files:

```bash
cd backend
node scripts/ingest.mjs ../datasets
```

The script will:
- Load the JSON data
- Generate embeddings locally using the all-MiniLM-L6-v2 model (free)
- Insert the data into the Supabase `verses` table
- Include a 600ms delay between requests

## Notes

- The script uses local embeddings (384 dimensions), no API costs.
- Ensure your Supabase database has the `pgvector` extension enabled and the `verses` table created.
- For large datasets, consider running in batches to avoid memory issues.