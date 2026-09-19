/**
 * PM2 process definition for the bare-process production deploy.
 *
 * Postgres and Redis are managed independently of this process (see
 * .env.production.example) — the app reads their connection strings from the env file
 * that PM2 loads, not from docker-compose.
 *
 * `fork` + a single instance is deliberate: lib/db.ts and lib/redis.ts hold singleton
 * connection pools on the process, and the spin lock is per-session Redis state rather
 * than in-process state.
 */
module.exports = {
  apps: [
    {
      name: "grouptalk",
      script: ".next/standalone/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Next's standalone server binds to HOSTNAME; without this it stays on loopback.
        HOSTNAME: "0.0.0.0",
      },
      max_memory_restart: "512M",
    },
  ],
};
