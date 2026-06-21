// Force restart to reload env variables
import "./env.js";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "faith_ai_super_secret_jwt_key_999";

// Instantiate Azure OpenAI Clients
let aiChat = null;
let aiEmbeddings = null;

if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  if (process.env.AZURE_OPENAI_CHAT_DEPLOYMENT) {
    aiChat = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_CHAT_DEPLOYMENT}`,
      defaultQuery: { "api-version": "2024-02-01" },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
    });
    console.log("Azure OpenAI Chat client initialized.");
  }
  
  if (process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT) {
    aiEmbeddings = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}`,
      defaultQuery: { "api-version": "2024-02-01" },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
    });
    console.log("Azure OpenAI Embeddings client initialized.");
  }
} else {
  console.warn("WARNING: Azure OpenAI configuration not found. AI features will fallback/mock.");
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
  return !banned.some((word) => query.includes(word));
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

// 🧠 Helper to get embeddings from Azure OpenAI
async function getEmbedding(text) {
  if (!aiEmbeddings) {
    console.warn("Azure OpenAI Embeddings client not configured. Generating mock 384-dim embedding.");
    // Return a normalized mock vector of 384 dimensions
    const vec = new Array(384).fill(0).map(() => Math.random() - 0.5);
    const len = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(val => val / len);
  }

  try {
    const response = await aiEmbeddings.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
      input: text,
      dimensions: 384, // matches vector(384) in PostgreSQL
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("Error generating embedding from Azure OpenAI:", err.message);
    throw err;
  }
}

// 🧠 Helper to generate content from Azure OpenAI
async function generateAIContent(prompt) {
  if (!aiChat) {
    throw new Error("Azure OpenAI Chat client is not configured.");
  }

  try {
    const response = await aiChat.chat.completions.create({
      model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500, // required for reasoning models to fit reasoning + output
    });
    return { text: response.choices[0].message.content };
  } catch (err) {
    console.error("Error in Azure OpenAI generation:", err.message);
    throw err;
  }
}

// 🧠 Helper to format verse content (handles both raw JSON and plain text)
function formatVerseContent(content) {
  try {
    const parsed = JSON.parse(content);
    let formatted = "";
    if (parsed.sanskrit) formatted += `Sanskrit: ${parsed.sanskrit}\n`;
    if (parsed.transliteration) formatted += `Transliteration: ${parsed.transliteration}\n`;
    if (parsed.meaning) formatted += `Meaning: ${parsed.meaning}\n`;
    return formatted.trim() || content;
  } catch (e) {
    return content;
  }
}

// 🧠 Helper to classify message intent using Azure OpenAI
async function classifyIntent(message) {
  if (!aiChat) {
    return "SPIRITUAL_ETHICAL";
  }

  const prompt = `
Analyze the following user message sent to a spiritual/moral guide chatbot.
Classify the intent into exactly one of these categories:
- GREETING: Welcomes, greetings, asking who you are, simple chat start.
- SPIRITUAL_ETHICAL: Sincere questions asking about moral, ethical, philosophical, scriptural, or spiritual guidance, duty, life advice, or wisdom.
- OUT_OF_CONTEXT: Queries about code, math, history (unrelated to religion), news, weather, or random web searches.

Message: "${message}"

Output ONLY the category name: GREETING, SPIRITUAL_ETHICAL, or OUT_OF_CONTEXT. Do not add punctuation or other text.
`.trim();

  try {
    const response = await aiChat.chat.completions.create({
      model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 100, // required for reasoning models
    });
    
    const intent = response.choices[0].message.content.trim().toUpperCase();
    console.log(`Intent classification for "${message}": ${intent}`);
    return intent;
  } catch (err) {
    console.error("Error classifying intent, defaulting to SPIRITUAL_ETHICAL:", err.message);
    return "SPIRITUAL_ETHICAL";
  }
}

// 🧠 Helper to build prompt
function buildPrompt(question, context) {
  return `
You are a calm, neutral religious assistant.

Answer the user's question clearly, warmly, and directly.
Use the provided scripture contexts to formulate your response.

Rules:
- Provide a clear, cohesive, and easily understandable summary.
- Keep the answer concise (3–5 lines).
- Avoid raw JSON fragments, technical fields, or metadata.
- Cite the book, chapter, and verse references (e.g. Bhagavad Gita 2.47).
- If the context does not contain the answer, state that you cannot find guidance on this specific query in the scriptures. Do not make up answers.

Context:
${context}

Question:
${question}

Answer:
`.trim();
}

// 🔐 JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// ----------------- Auth Routes -----------------

// Passwordless email login/register
app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    // Check if user exists
    let userRes = await pool.query("SELECT id, email FROM users WHERE email = $1", [cleanEmail]);
    let user = userRes.rows[0];

    if (!user) {
      // Create user
      const insertRes = await pool.query(
        "INSERT INTO users (email) VALUES ($1) RETURNING id, email",
        [cleanEmail]
      );
      user = insertRes.rows[0];
      console.log(`Created user: ${user.email} (${user.id})`);
    } else {
      console.log(`Logged in user: ${user.email} (${user.id})`);
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({ error: "Authentication failed", details: err.message });
  }
});

// Google OAuth verification and login/register
app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Google ID token is required" });
  }

  try {
    // Call Google's tokeninfo endpoint to verify token validity
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    
    if (!googleRes.ok) {
      const errText = await googleRes.text();
      console.error("Google token verification failed:", errText);
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const payload = await googleRes.json();
    const { email, email_verified, aud } = payload;

    if (!email_verified) {
      return res.status(400).json({ error: "Google email is not verified" });
    }

    // Optional: Verify audience matches client ID if configured
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && aud !== configuredClientId) {
      console.error(`Google token audience mismatch. Expected ${configuredClientId}, got ${aud}`);
      return res.status(400).json({ error: "Invalid client application" });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Check if user exists
    let userRes = await pool.query("SELECT id, email FROM users WHERE email = $1", [cleanEmail]);
    let user = userRes.rows[0];

    if (!user) {
      // Create user
      const insertRes = await pool.query(
        "INSERT INTO users (email) VALUES ($1) RETURNING id, email",
        [cleanEmail]
      );
      user = insertRes.rows[0];
      console.log(`Google registered new user: ${user.email} (${user.id})`);
    } else {
      console.log(`Google logged in user: ${user.email} (${user.id})`);
    }

    // Sign JWT
    const appToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token: appToken, user });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed", details: err.message });
  }
});

// Get current user profile
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ----------------- Chat Persistence Routes -----------------

// Fetch chats for the authenticated user and given theme
app.get("/api/chats", authenticateToken, async (req, res) => {
  const { theme } = req.query;
  if (!theme) {
    return res.status(400).json({ error: "Theme query parameter is required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, created_at, messages FROM chats WHERE user_id = $1 AND theme = $2 ORDER BY created_at DESC",
      [req.user.id, theme]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Create a new chat session
app.post("/api/chats", authenticateToken, async (req, res) => {
  const { theme, messages } = req.body;
  if (!theme || !messages) {
    return res.status(400).json({ error: "Theme and messages are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO chats (user_id, theme, messages) VALUES ($1, $2, $3) RETURNING id, created_at, messages",
      [req.user.id, theme, JSON.stringify(messages)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ error: "Failed to save chat" });
  }
});

// Update an existing chat's messages
app.put("/api/chats/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body;
  if (!messages) {
    return res.status(400).json({ error: "Messages are required" });
  }

  try {
    const result = await pool.query(
      "UPDATE chats SET messages = $1 WHERE id = $2 AND user_id = $3 RETURNING id, created_at, messages",
      [JSON.stringify(messages), id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Chat not found or access denied" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update chat error:", err);
    res.status(500).json({ error: "Failed to update chat" });
  }
});

// Delete a chat session
app.delete("/api/chats/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM chats WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Chat not found or access denied" });
    }

    res.json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Delete chat error:", err);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

// ----------------- Core RAG / Search Routes -----------------

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Faith AI Backend is running on Azure stack" });
});

// Ingest data endpoint
app.post("/api/ingest", async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of verse objects" });
    }

    console.log(`Starting ingestion of ${data.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of data) {
      try {
        const semanticContext = `Book: ${record.book}, Chapter: ${record.chapter}, Verse: ${record.verse}. Text: ${record.content}`;
        const embedding = await getEmbedding(semanticContext);

        const religion = record.religion || "christianity";

        await pool.query(
          `INSERT INTO verses (religion, book, chapter, verse, content, embedding, transliteration, meaning, search_text)
           VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9)`,
          [
            religion,
            record.book,
            record.chapter?.toString(),
            record.verse?.toString(),
            record.content,
            `[${embedding.join(",")}]`,
            record.transliteration || null,
            record.meaning || null,
            record.search_text || `${record.book} ${record.chapter}:${record.verse} ${record.content}`.toLowerCase(),
          ]
        );

        successCount++;
        // Small delay to prevent overwhelming Azure OpenAI rate limits
        await new Promise((r) => setTimeout(r, 100));
      } catch (recordError) {
        console.error(`Error processing record ${record.chapter}:${record.verse}:`, recordError.message);
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

// Query verses endpoint (semantic search)
app.post("/api/query", async (req, res) => {
  try {
    const { query, book, limit = 5, threshold = 0.1 } = req.body;

    if (!query || !book) {
      return res.status(400).json({ error: "Query and book are required" });
    }

    let religion = book.toLowerCase();
    if (religion === "gita" || religion === "krishna") {
      religion = "hinduism";
    } else if (religion === "bible") {
      religion = "christianity";
    } else if (religion === "quran") {
      religion = "islam";
    }

    const sanitized = sanitizeQuery(query);

    if (!isValidQuery(sanitized)) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const rewritten = rewriteQuery(sanitized);
    const queryEmbedding = await getEmbedding(rewritten);

    const result = await pool.query(
      "SELECT * FROM match_verses($1::vector, $2::float, $3::int, $4::text)",
      [`[${queryEmbedding.join(",")}]`, threshold, limit, religion]
    );

    res.json({ verses: result.rows });
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({ error: "Query failed", details: error.message });
  }
});

// Krishna chat endpoint
app.post("/api/chat/krishna", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sanitized = sanitizeQuery(message);

    if (!isValidQuery(sanitized)) {
      return res.json({ reply: "Invalid or harmful query." });
    }

    // Intent routing
    const intent = await classifyIntent(message);
    if (intent === "GREETING") {
      return res.json({
        reply: "Greetings! I am Krishna. Seek your dharma and ask me any questions regarding duty, ethics, or the spiritual path. How can I guide you today?",
      });
    } else if (intent === "OUT_OF_CONTEXT") {
      return res.json({
        reply: "I am a spiritual guide here to discuss moral, ethical, and philosophical teachings. I cannot assist with out-of-context topics.",
      });
    }

    const rewritten = rewriteQuery(sanitized);
    const queryEmbedding = await getEmbedding(rewritten);

    const result = await pool.query(
      "SELECT * FROM match_verses($1::vector, $2::float, $3::int, $4::text)",
      [`[${queryEmbedding.join(",")}]`, 0.1, 5, "hinduism"]
    );

    const data = result.rows;
    const filtered = (data || [])
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    if (!filtered.length) {
      return res.json({
        reply: "I couldn’t find clear references for this in the Bhagavad Gita. I can give a general explanation if you want.",
      });
    }

    const context = filtered
      .map((v) => `${v.book} ${v.chapter}:${v.verse} →\n${formatVerseContent(v.content)}`)
      .join("\n\n");
      
    const reference = filtered
      .map((v) => `Bhagavad Gita ${v.chapter}:${v.verse}`)
      .join("; ");

    const prompt = buildPrompt(sanitized, context);
    let reply;

    try {
      const response = await generateAIContent(prompt);
      reply = response.text;
    } catch (err) {
      console.error("Azure OpenAI LLM failed, using fallback:", err.message);
      // Smart Fallback
      reply = filtered
        .map((v) => v.content.split("\n")[0])
        .slice(0, 2)
        .join(" ");
      reply = `Based on Bhagavad Gita teachings: ${reply}`;
    }

    res.json({ reply, reference, verses: data });
  } catch (error) {
    console.error("Krishna chat error:", error);
    res.status(500).json({ error: "Krishna chat failed", details: error.message });
  }
});

// Bible chat endpoint
app.post("/api/chat/bible", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const sanitized = sanitizeQuery(message);
    if (!isValidQuery(sanitized)) {
      return res.json({ reply: "Invalid or harmful query." });
    }

    // Intent routing
    const intent = await classifyIntent(message);
    if (intent === "GREETING") {
      return res.json({
        reply: "Peace be with you. I am here to share teachings and wisdom from the Holy Scriptures. How can I guide your path today?",
      });
    } else if (intent === "OUT_OF_CONTEXT") {
      return res.json({
        reply: "I am a scriptural assistant here to provide guidance on moral, ethical, and biblical teachings. I cannot assist with out-of-context topics.",
      });
    }

    const rewritten = rewriteQuery(sanitized);
    const queryEmbedding = await getEmbedding(rewritten);

    const result = await pool.query(
      "SELECT * FROM match_verses($1::vector, $2::float, $3::int, $4::text)",
      [`[${queryEmbedding.join(",")}]`, 0.1, 5, "christianity"]
    );

    const data = result.rows;
    const filtered = data || [];
    if (!filtered.length) {
      return res.json({
        reply: "I couldn’t find clear references for this in the Bible. I can give a general explanation if you want.",
      });
    }

    const context = filtered
      .map((v) => `${v.book} ${v.chapter}:${v.verse} →\n${formatVerseContent(v.content)}`)
      .join("\n\n");
      
    const reference = filtered
      .map((v) => `${v.book} ${v.chapter}:${v.verse}`)
      .join("; ");

    const prompt = buildPrompt(message, context);
    let reply;

    try {
      const response = await generateAIContent(prompt);
      reply = response.text;
    } catch (err) {
      console.error("Azure OpenAI LLM failed, using fallback:", err.message);
      reply = `Based on Bible teachings: ` + filtered.map((v) => v.content.split("\n")[0]).slice(0, 2).join(" ");
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
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const sanitized = sanitizeQuery(message);
    if (!isValidQuery(sanitized)) {
      return res.json({ reply: "Invalid or harmful query." });
    }

    // Intent routing
    const intent = await classifyIntent(message);
    if (intent === "GREETING") {
      return res.json({
        reply: "As-salamu alaykum. I am here to provide guidance inspired by Islamic teachings and the Holy Quran. What would you like to ask today?",
      });
    } else if (intent === "OUT_OF_CONTEXT") {
      return res.json({
        reply: "I am an Islamic guidance assistant here to explain moral, ethical, and Quranic teachings. I cannot assist with out-of-context topics.",
      });
    }

    const rewritten = rewriteQuery(sanitized);
    const queryEmbedding = await getEmbedding(rewritten);

    const result = await pool.query(
      "SELECT * FROM match_verses($1::vector, $2::float, $3::int, $4::text)",
      [`[${queryEmbedding.join(",")}]`, 0.1, 5, "islam"]
    );

    const data = result.rows;
    const filtered = data || [];
    if (!filtered.length) {
      return res.json({
        reply: "I couldn’t find clear references for this in the Quran. I can give a general explanation if you want.",
      });
    }

    const context = filtered
      .map((v) => `${v.book} ${v.chapter}:${v.verse} →\n${formatVerseContent(v.content)}`)
      .join("\n\n");
      
    const reference = filtered
      .map((v) => `${v.book} ${v.chapter}:${v.verse}`)
      .join("; ");

    const prompt = buildPrompt(message, context);
    let reply;

    try {
      const response = await generateAIContent(prompt);
      reply = response.text;
    } catch (err) {
      console.error("Azure OpenAI LLM failed, using fallback:", err.message);
      reply = `Based on Quranic teachings: ` + filtered.map((v) => v.content.split("\n")[0]).slice(0, 2).join(" ");
    }
    res.json({ reply, reference, verses: data });
  } catch (error) {
    console.error("Quran chat error:", error);
    res.status(500).json({ error: "Quran chat failed", details: error.message });
  }
});

// Start server
function startServer() {
  app.listen(port, () => {
    console.log(`Faith AI Backend server running on port ${port}`);
  });
}

startServer();
