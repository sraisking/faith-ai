# Faith AI - Separated Frontend & Backend

This project is now organized with separate folders for UI (frontend) and API (backend).

## Project Structure

```
faith-ai/
├── frontend/          # Next.js React app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
├── backend/           # Express API server
│   ├── express-server.js
│   ├── scripts/
│   ├── supabase/
│   └── package.json
├── .env.local         # Shared environment variables
└── package.json       # Root scripts for running both
```

## Setup

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up Supabase:**
   - Run the SQL in `backend/supabase/setup.sql` in your Supabase dashboard

3. **Environment Variables** (in `.env.local`):
   ```
   GEMINI_API_KEY=your_gemini_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   BACKEND_URL=http://localhost:3001
   ```

4. **Ingest data (optional for basic functionality):**
   ```bash
   cd backend && node scripts/ingest.mjs scripts/full_gita_dataset.json
   ```
   Or use the API: `POST http://localhost:3001/api/ingest`

## Running the Application

**Development (both frontend and backend):**
```bash
npm run dev
```

**Production:**
```bash
npm run build:frontend
npm run start:frontend  # Runs on port 3000
npm run start:backend   # Runs on port 3001
```

## API Endpoints

### Backend (Express - Port 3001)

- `GET /health` - Health check
- `POST /api/ingest` - Ingest verse data
- `POST /api/query` - Query relevant verses

### Frontend (Next.js - Port 3000)

- `POST /api/chat/krishna` - Chat with Krishna AI (with RAG)
- `POST /api/chat/bible` - Chat with Bible AI
- `POST /api/chat/quran` - Chat with Quran AI

## Data Ingestion

Use the backend API to ingest data:

```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d @backend/scripts/full_gita_dataset.json
```

Or use the script:
```bash
cd backend && node scripts/ingest.mjs scripts/full_gita_dataset.json
```
