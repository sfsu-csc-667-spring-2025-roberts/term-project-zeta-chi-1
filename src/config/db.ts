// src/config/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
console.log('Loaded Dotenv');
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Database User:', process.env.DB_USER);
console.log('Database Host:', process.env.DB_HOST);
console.log('Database Name:', process.env.DB_DATABASE);
console.log('Database Password:', process
  .env.DB_PASSWORD);
console.log('Database Port:', process.env.DB_PORT);
console.log('Database SSL:', process.env.DB_SSL);

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    });

pool.on('connect', () => {
  console.log('Connected to the Database');
});

pool.on('error', err => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;