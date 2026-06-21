import fs from "fs";
import path from "path";

const envPaths = [
  path.resolve("../.env.local"),
  path.resolve("./.env.local"),
  path.resolve("../../.env.local"),
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) return;
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length) {
        const value = valueParts.join("=");
        process.env[key.trim()] = value.trim();
      }
    });
    console.log(`[Env Loader] Loaded environment variables from ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn("[Env Loader] WARNING: Could not find any .env.local file in paths:", envPaths);
}
