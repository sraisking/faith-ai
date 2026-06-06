module.exports = {
  apps: [
    {
      name: "faith-ai-backend",
      cwd: "./backend",
      script: "express-server.js",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    },
    {
      name: "faith-ai-frontend",
      cwd: "./frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    }
  ]
};
