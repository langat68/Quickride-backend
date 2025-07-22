import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 🔹 Enum for user roles
export const userRole = pgEnum("user_role", ["customer", "admin", "manager"]);

// 🔹 Users Table (Updated as requested)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").default("customer").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 🔹 Cars Table
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // SUV, Sedan, etc.
  pricePerDay: decimal("price_per_day", { precision: 8, scale: 2 }).notNull(),
  seats: integer("seats").notNull(),
  fuelType: varchar("fuel_type", { length: 20 }).notNull(),
  transmission: varchar("transmission", { length: 20 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🔹 Bookings Table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  carId: integer("car_id").references(() => cars.id).notNull(),
  pickupDate: timestamp("pickup_date").notNull(),
  returnDate: timestamp("return_date").notNull(),
  pickupLocation: varchar("pickup_location", { length: 100 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, etc.
  bookingReference: varchar("booking_reference", { length: 50 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🔹 Payments Table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // mpesa, card, etc.
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  transactionId: varchar("transaction_id", { length: 100 }),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

//
// 🔹 Relations
//

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const carsRelations = relations(cars, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [bookings.carId],
    references: [cars.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

//
// 🔹 Types
//
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Car = typeof cars.$inferSelect;
export type NewCar = typeof cars.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
