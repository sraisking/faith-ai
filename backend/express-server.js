import express from "express";
import cors from "cors";
import { pipeline } from "@xenova/transformers";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

// 🧠 Sanitize user input
function sanitizeQuery(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 🧠 Validate input
function isValidQuery(query) {
  if (!query || query.length < 3) return false;

  const banned = ["kill all", "hate", "violence against"];
  return !banned.some(word => query.includes(word));
}

// 🧠 Rewrite for better semantic search
function rewriteQuery(query) {
  const base = sanitizeQuery(query);

  return `
${base}

Related concepts:
- truth
- honesty
- morality
- right and wrong
- ethics
- duty
`.trim();
}
// Load environment variables from .env.local
if (fs.existsSync("../.env.local")) {
  const envContent = fs.readFileSync("../.env.local", "utf8");
  envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      const value = valueParts.join("=");
      process.env[key.trim()] = value.trim();
    }
  });
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://pzhiavpfbvypidxjdzkm.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aGlhdnBmYnZ5cGlkeGpkemttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTMwMDg2NiwiZXhwIjoyMDkwODc2ODY2fQ.fudPlH5th3We4wbLtgLE8eINlKwNiz3Q4MMUwu68I44";

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize the embedding model
let extractor;
async function initExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model loaded");
  }
  return extractor;
}
function buildPrompt(question, context) {
  return `
You are a calm, neutral religious assistant.

Answer using ONLY the given context.

Rules:
- Keep answer short (3–5 lines)
- Use simple English
- Do NOT guess
- Mention differences if needed
- Add small scientific/logical insight if relevant
- Always include references

Context:
${context}

Question:
${question}

Answer:
`;
}
async function generateAIContent(prompt, config = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("No AI configured");
  }
  const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError = null;
  for (const model of models) {
    try {
      console.log(`Trying LLM model: ${model}`);
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });
      if (result && result.text) {
        console.log(`Successfully generated content with model: ${model}`);
        return result;
      }
    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All LLM models failed");
}
// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Faith AI Backend is running" });
});

// Ingest data endpoint
app.post("/api/ingest", async (req, res) => {
  try {
    const { data } = req.body; // Expect array of verse objects

    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: "Data must be an array of verse objects" });
    }

    console.log(`Starting ingestion of ${data.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of data) {
      try {
        // Create semantic context
        const semanticContext = `Book: ${record.book}, Chapter: ${record.chapter}, Verse: ${record.verse}. Text: ${record.content}`;

        // Generate embedding
        await initExtractor();
        const output = await extractor(semanticContext, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data);

        // Insert into database
        const { error } = await supabase.from("verses").insert({
          book: record.book,
          chapter: record.chapter,
          verse: record.verse,
          content: record.content,
          embedding: embedding,
        });

        if (error) {
          console.error(
            `Error inserting ${record.chapter}:${record.verse}:`,
            error,
          );
          errorCount++;
        } else {
          successCount++;
        }

        // Small delay to prevent overwhelming
        await new Promise((r) => setTimeout(r, 100));
      } catch (recordError) {
        console.error(
          `Error processing record ${record.chapter}:${record.verse}:`,
          recordError,
        );
        errorCount++;
      }
    }

    res.json({
      message: "Ingestion completed",
      total: data.length,
      successful: successCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    res.status(500).json({ error: "Ingestion failed", details: error.message });
  }
});

// Query verses endpoint
app.post("/api/query", async (req, res) => {
  try {
    const { query, book, limit = 5, threshold = 0.1 } = req.body;

    if (!query || !book) {
      return res.status(400).json({ error: "Query and book are required" });
    }

    // Map book to religion for the database RPC function
    let religion = book.toLowerCase();
    if (religion === "gita" || religion === "krishna") {
      religion = "hinduism";
    } else if (religion === "bible") {
      religion = "christianity";
    } else if (religion === "quran") {
      religion = "islam";
    }

    // Generate embedding for query
    await initExtractor();
    const sanitized = sanitizeQuery(query);

    if (!isValidQuery(sanitized)) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const rewritten = rewriteQuery(sanitized);

    const output = await extractor(rewritten, {
      pooling: "mean",
      normalize: true,
    });
    const queryEmbedding = Array.from(output.data);

    // Query database
    const { data, error } = await supabase.rpc("match_verses", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_religion: religion,
    });

    if (error) {
      throw error;
    }

    res.json({ verses: data });
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({ error: "Query failed", details: error.message });
  }
});

// Krishna chat endpoint
// async function rewriteQuery(question) {
//   return `
// User question: ${question}

// Rewrite this into a detailed semantic search query for religious texts.
// Include related concepts, synonyms, and context.

// Examples:
// - food rules
// - meat consumption
// - animal killing
// - cow, beef
// - religious law, allowed, forbidden

// Final query:
//   `.trim();
// }
app.post("/api/chat/krishna", async (req, res) => {
  try {
    const { message, limit = 3, threshold = 0.1 } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    await initExtractor();

    const sanitized = sanitizeQuery(message);

    if (!isValidQuery(sanitized)) {
      return res.json({ reply: "Invalid or harmful query." });
    }

    const rewritten = rewriteQuery(sanitized);

    const output = await extractor(rewritten, {
      pooling: "mean",
      normalize: true,
    });

    const queryEmbedding = Array.from(output.data);

    const { data, error } = await supabase.rpc("match_verses", {
      filter_religion: 'hinduism',
      match_count: 5,
      match_threshold: 0.1,
      query_embedding: queryEmbedding,
    });
    if (error) {
      throw error;
    }

    const filtered = (data || [])
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    if (!filtered.length) {
      return res.json({
        reply: "I couldn’t find clear references for this. I can give a general explanation if you want."
      });
    }

    const context = filtered.map(v =>
      `${v.book} ${v.chapter}:${v.verse} → ${v.content}`
    ).join("\n");
    const reference = filtered
      .map(v => `Bhagavad Gita ${v.chapter}:${v.verse}`)
      .join("; ");
    // Build prompt
    const prompt = buildPrompt(sanitized, context);
    let reply;

    try {
      if (process.env.GEMINI_API_KEY) {
        const result = await generateAIContent(prompt);
        reply = result.text;
      } else {
        throw new Error("No AI configured");
      }

    } catch (err) {
      console.error("LLM failed:", err.message);

      // ✅ SMART FALLBACK (important)
      reply = filtered
        .map(v => v.content.split("\n")[0]) // take main line only
        .slice(0, 2)
        .join(" ");

      reply = `Based on available teachings: ${reply}`;
    }


    res.json({ reply, reference, verses: data });
  } catch (error) {
    console.error("Krishna chat error:", error);
    res
      .status(500)
      .json({ error: "Krishna chat failed", details: error.message });
  }
});

// Bible chat endpoint
app.post("/api/chat/bible", async (req, res) => {
  try {
    const { message, limit = 3, threshold = 0.1 } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    await initExtractor();
    const rewritten = await rewriteQuery(message);
    const output = await extractor(rewritten, { pooling: "mean", normalize: true });
    const queryEmbedding = Array.from(output.data);

    const { data, error } = await supabase.rpc("match_verses", {
      filter_religion: 'christianity',
      match_count: 5,
      match_threshold: 0.1,
      query_embedding: queryEmbedding,
    });
    if (error) throw error;

    const filtered = data || [];
    if (!filtered.length) {
      return res.json({ reply: "I couldn’t find clear references for this. I can give a general explanation if you want." });
    }

    const context = filtered.map(v => `${v.book} ${v.chapter}:${v.verse} → ${v.content}`).join("\n");
    const reference = filtered.map(v => `${v.book} ${v.chapter}:${v.verse}`).join("; ");
    const prompt = buildPrompt(message, context);

    let reply;
    try {
      if (process.env.GEMINI_API_KEY) {
        const result = await generateAIContent(prompt);
        reply = result.text;
      } else {
        throw new Error("No AI configured");
      }
    } catch (err) {
      console.error("LLM failed:", err.message);
      reply = `Based on available teachings: ` + filtered.map(v => v.content.split("\n")[0]).slice(0, 2).join(" ");
    }
    res.json({ reply, reference, verses: data });
  } catch (error) {
    console.error("Bible chat error:", error);
    res.status(500).json({ error: "Bible chat failed", details: error.message });
  }
});

// Quran chat endpoint
app.post("/api/chat/quran", async (req, res) => {
  try {
    const { message, limit = 3, threshold = 0.1 } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    await initExtractor();
    const rewritten = await rewriteQuery(message);
    const output = await extractor(rewritten, { pooling: "mean", normalize: true });
    const queryEmbedding = Array.from(output.data);

    const { data, error } = await supabase.rpc("match_verses", {
      filter_religion: 'islam',
      match_count: 5,
      match_threshold: 0.1,
      query_embedding: queryEmbedding,
    });
    if (error) throw error;

    const filtered = data || [];
    if (!filtered.length) {
      return res.json({ reply: "I couldn’t find clear references for this. I can give a general explanation if you want." });
    }

    const context = filtered.map(v => `${v.book} ${v.chapter}:${v.verse} → ${v.content}`).join("\n");
    const reference = filtered.map(v => `${v.book} ${v.chapter}:${v.verse}`).join("; ");
    const prompt = buildPrompt(message, context);

    let reply;
    try {
      if (process.env.GEMINI_API_KEY) {
        const result = await generateAIContent(prompt);
        reply = result.text;
      } else {
        throw new Error("No AI configured");
      }
    } catch (err) {
      console.error("LLM failed:", err.message);
      reply = `Based on available teachings: ` + filtered.map(v => v.content.split("\n")[0]).slice(0, 2).join(" ");
    }
    res.json({ reply, reference, verses: data });
  } catch (error) {
    console.error("Quran chat error:", error);
    res.status(500).json({ error: "Quran chat failed", details: error.message });
  }
});

// Start server after model is ready
async function startServer() {
  try {
    await initExtractor();
    app.listen(port, () => {
      console.log(`Faith AI Backend server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();
