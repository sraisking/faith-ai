import pg from "pg";

const connectionString = process.env.AZURE_POSTGRESQL_CONNECTION_STRING;

if (!connectionString) {
  console.warn("WARNING: AZURE_POSTGRESQL_CONNECTION_STRING is not set in environment variables!");
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && connectionString.includes("sslmode=disable")
    ? false
    : {
        rejectUnauthorized: false,
      },
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection test failed:", err.message);
  } else {
    console.log("Database connected successfully at:", res.rows[0].now);
  }
});

export default pool;
