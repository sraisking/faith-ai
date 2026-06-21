import fs from "fs";
import path from "path";
import OpenAI from "openai";
import pg from "pg";

// 🌐 Load environment variables
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "../.env.local"),
  path.resolve(process.cwd(), "backend/.env.local"),
];

let loadedEnv = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    });
    console.log(`Loaded environment from ${envPath}`);
    loadedEnv = true;
    break;
  }
}

if (!loadedEnv) {
  console.warn("WARNING: No .env.local file found. Ingestion might fail if credentials are missing.");
}

// 🌐 Initialize Azure OpenAI Embeddings client
let aiEmbeddings = null;
if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT) {
  aiEmbeddings = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}`,
    defaultQuery: { "api-version": "2024-02-01" },
    defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
  });
  console.log("Azure OpenAI Embeddings client initialized for ingestion.");
} else {
  console.warn("WARNING: Azure OpenAI Embeddings config not found. Using mock embeddings.");
}

// 🌐 Initialize PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.AZURE_POSTGRESQL_CONNECTION_STRING,
  ssl: process.env.AZURE_POSTGRESQL_CONNECTION_STRING && process.env.AZURE_POSTGRESQL_CONNECTION_STRING.includes("sslmode=disable")
    ? false
    : {
        rejectUnauthorized: false,
      },
});

function loadJsonRecords(filePath) {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(rawData);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed?.data && Array.isArray(parsed.data)) {
    return parsed.data;
  }

  throw new Error(`Unsupported JSON shape in ${filePath}`);
}

async function getEmbedding(text) {
  if (!aiEmbeddings) {
    // Generate normalized mock vector of size 384
    const vec = new Array(384).fill(0).map(() => Math.random() - 0.5);
    const len = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map(v => v / len);
  }

  const response = await aiEmbeddings.embeddings.create({
    model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    input: text,
    dimensions: 384,
  });
  return response.data[0].embedding;
}

async function ingestFile(filePath) {
  const records = loadJsonRecords(filePath);
  console.log(`Loaded ${records.length} records from ${filePath}.`);

  const batchSize = 50;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const rows = [];

    for (let j = 0; j < batch.length; j++) {
      const record = batch[j];

      try {
        // Clean text for embedding
        const semanticContext = `
${record.text || ""}
${record.word_meanings || ""}
        `.trim().toLowerCase();

        const embedding = await getEmbedding(semanticContext);

        // Structured content
        const content = {
          sanskrit: record.text,
          transliteration: record.transliteration,
          meaning: record.word_meanings,
        };

        rows.push({
          religion: "hinduism",
          book: "gita",
          chapter: record.chapter_number,
          verse: record.verse_number,
          content: JSON.stringify(content),
          search_text: `${record.text} ${record.word_meanings}`.toLowerCase(),
          embedding,
          transliteration: record.transliteration,
          meaning: record.word_meanings,
        });

        // Throttle slightly to respect Azure rate limits
        await new Promise((r) => setTimeout(r, 80));
      } catch (err) {
        console.error(
          `Processing error at ${record.chapter_number}:${record.verse_number}:`,
          err.message
        );
      }
    }

    if (rows.length > 0) {
      const values = [];
      const placeholders = [];
      let index = 1;

      for (const row of rows) {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}::vector, $${index + 6}, $${index + 7}, $${index + 8})`);
        values.push(
          row.religion,
          row.book,
          row.chapter?.toString(),
          row.verse?.toString(),
          row.content,
          `[${row.embedding.join(",")}]`,
          row.transliteration || null,
          row.meaning || null,
          row.search_text
        );
        index += 9;
      }

      const query = `
        INSERT INTO verses (religion, book, chapter, verse, content, embedding, transliteration, meaning, search_text)
        VALUES ${placeholders.join(", ")}
      `;

      try {
        await pool.query(query, values);
        console.log(`Inserted batch ${i} → ${i + batch.length}`);
      } catch (insertErr) {
        console.error(`Database error during batch insert at index ${i}:`, insertErr.message);
      }
    }
  }

  console.log("Ingestion completed for this file.");
}

async function ingestPath(targetPath) {
  const resolved = path.resolve(targetPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }

  const stats = fs.statSync(resolved);

  if (stats.isDirectory()) {
    const files = fs
      .readdirSync(resolved)
      .filter((file) => file.endsWith(".json"));
    if (!files.length) {
      throw new Error(`No JSON files found in directory: ${resolved}`);
    }

    for (const file of files) {
      await ingestFile(path.join(resolved, file));
    }
  } else {
    await ingestFile(resolved);
  }
}

const target = process.argv[2];
if (!target) {
  console.log(
    "Usage: node ingest.mjs path/to/dataset.json OR node ingest.mjs path/to/directory",
  );
  await pool.end();
  process.exit(1);
}

ingestPath(target)
  .then(async () => {
    console.log("All ingestion completed.");
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Fatal Ingestion Error:", error);
    await pool.end();
    process.exit(1);
  });
