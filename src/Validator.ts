import { z } from "zod";

// =======================
// Auth Validators
// =======================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    newPassword: z.string().min(6),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

// =======================
// User Validators
// =======================

export const createUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(6), // ✅ changed from passwordHash
  role: z.enum(["customer", "admin", "manager"]).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(), // ✅ changed from passwordHash
  role: z.enum(["customer", "admin", "manager"]).optional(),
});

export const userIdParam = z.object({
  id: z.coerce.number().positive(),
});

// =======================
// Car Validators
// =======================

export const createCarSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  pricePerDay: z.coerce.number().positive(),
  seats: z.coerce.number().int().positive(),
  fuelType: z.string().min(2),
  transmission: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  location: z.string().min(2),
  isAvailable: z.boolean().optional(),
});

export const updateCarSchema = createCarSchema.partial();

export const carIdParam = z.object({
  id: z.coerce.number().positive(),
});

// =======================
// Booking Validators
// =======================



export const createBookingSchema = z.object({
  userId: z.coerce.number().positive(),
  carId: z.coerce.number().positive(),
  pickupDate: z.coerce.date(),         // ✅ converts ISO string → Date
  returnDate: z.coerce.date(),         // ✅ same here
  pickupLocation: z.string().min(2),
  totalAmount: z.coerce.number().positive(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  bookingReference: z.string().min(4),
});

export const updateBookingSchema = createBookingSchema.partial();

export const bookingIdParam = z.object({
  id: z.coerce.number().positive(),
});

// =======================

// Payment Validators
// =======================
export const createPaymentSchema = z.object({
  bookingId: z.coerce.number().positive(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["card", "mpesa", "bank_transfer"]),
  phoneNumber: z.string().min(10).max(15), // ✅ Required
  paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  transactionId: z.string().optional(),
  paymentDate: z.coerce.date().optional(),
});


export const updatePaymentSchema = createPaymentSchema.partial();

export const paymentIdParam = z.object({
  id: z.coerce.number().positive(),
});




export const initiateMpesaSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  amount: z.coerce.number().positive(),
});
