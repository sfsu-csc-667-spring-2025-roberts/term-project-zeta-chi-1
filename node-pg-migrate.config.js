/** @type {import("node-pg-migrate").Options} */
module.exports = {
    migrationsTable: 'pgmigrations',
    dir: 'migrations',
    direction: 'up',
    timestamp: true,        // files will be 20250516xxxx__name.sql
    // by default it reads DATABASE_URL; fall back to individual vars
    databaseUrl: process.env.DATABASE_URL || {
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      database: process.env.DB_DATABASE,
    },
  };
// Note: The above code is a configuration file for node-pg-migrate, a tool for managing PostgreSQL database migrations in Node.js applications.  