import { pipeline } from "@xenova/transformers";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Configuration
const supabaseUrl = "https://pzhiavpfbvypidxjdzkm.supabase.co";
const supabaseKey =
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

async function ingestFile(filePath) {
  const records = loadJsonRecords(filePath);
  console.log(`Loaded ${records.length} records from ${filePath}.`);

  await initExtractor();

  const batchSize = 50;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const rows = [];

    for (let j = 0; j < batch.length; j++) {
      const record = batch[j];

      try {
        // ✅ Clean text for embedding (NO metadata here)
        const semanticContext = `
${record.text || ""}
${record.word_meanings || ""}
        `.trim().toLowerCase();

        const output = await extractor(semanticContext, {
          pooling: "mean",
          normalize: true,
        });

        const embedding = Array.from(output.data);

        // ✅ Structured content (better for LLM later)
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

          // 🔥 store structured JSON
          content: JSON.stringify(content),

          // 🔥 for hybrid search later
          search_text: `${record.text} ${record.word_meanings}`.toLowerCase(),

          embedding,
        });
      } catch (err) {
        console.error(
          `Processing error at ${record.chapter_number}:${record.verse_number}`,
          err.message
        );
      }
    }

    // ✅ Batch insert (FAST)
    const { error } = await supabase.from("verses").insert(rows);

    if (error) {
      console.error("Batch insert error:", error.message);
    } else {
      console.log(`Inserted batch ${i} → ${i + batch.length}`);
    }
  }

  console.log("Ingestion completed.");
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
  process.exit(1);
}

ingestPath(target)
  .then(() => console.log("All ingestion completed."))
  .catch((error) => {
    console.error("Fatal Ingestion Error:", error);
    process.exit(1);
  });
