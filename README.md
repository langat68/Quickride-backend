```
npm install
npm run dev
```

```
open http://localhost:3000
```
{
  "email": "alice@example.com",
  "password": "SuperSecurePassword123!"
}

{
  "name": "Alice Kiprono",
  "email": "alice@example.com",
  "passwordHash": "SuperSecurePassword123!",
  "role": "customer"
}


import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

// 🔍 Debug: check if env is loaded correctly
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined in .env");
}

console.log("✅ Loaded DATABASE_URL:", process.env.DATABASE_URL);

// 🛠️ Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🧪 Optional: test connection immediately
pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch((err) => {
    console.error("❌ Connection to PostgreSQL failed:", err);
    process.exit(1);
  });

// 🌱 Create Drizzle client
export const db = drizzle(pool, { schema });
