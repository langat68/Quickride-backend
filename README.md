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


//jsons 


users
  {
    "name": "Alice Wanjiku",
    "email": "alice@example.com",
    "password": "password123",
    "role": "customer"
  }

car
  {
    "id": 1,
    "name": "Toyota RAV4",
    "category": "SUV",
    "pricePerDay": 4500.00,
    "seats": 5,
    "fuelType": "Petrol",
    "transmission": "Automatic",
    "description": "Spacious and reliable SUV for urban and off-road travel.",
    "imageUrl": "https://example.com/images/rav4.jpg",
    "location": "Nairobi",
    "isAvailable": true
  }


  bookings 
  {
    "id": 1,
    "userId": 1,
    "carId": 1,
    "pickupDate": "2025-07-25T08:00:00.000Z",
    "returnDate": "2025-07-28T18:00:00.000Z",
    "pickupLocation": "JKIA Airport, Nairobi",
    "totalAmount": 13500.00,
    "status": "pending",
    "bookingReference": "BOOK123456"
  }


// bookings

    {
    "id": 1,
    "bookingId": 1,
    "amount": 13500.00,
    "paymentMethod": "mpesa",
    "phoneNumber": "254712345678",
    "paymentStatus": "pending",
    "transactionId": "MPESA123456789",
    "paymentDate": "2025-07-22T19:30:00.000Z"
  }

  // payments

  {
    "bookingId": 1,
    "amount": 13500.00,
    "paymentMethod": "mpesa",
    "paymentStatus": "completed",
    "transactionId": "MPESA123456",
    "paymentDate": "2025-07-22T14:30:00Z"
  }