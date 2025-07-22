// src/db/client.ts
import 'dotenv/config' // ✅ This loads .env vars into process.env
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js' 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // This will now be defined
})

export const db = drizzle(pool, { schema })