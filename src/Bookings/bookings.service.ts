import { db } from '../db/db.js';
import { bookings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class BookingService {
  async createBooking(data: typeof bookings.$inferInsert) {
    const [newBooking] = await db.insert(bookings).values(data).returning();
    return newBooking;
  }

  async getBookingById(id: number) {
    return db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        car: true,
        user: true,
        payments: true,
      },
    });
  }

  async getAllBookings() {
    return db.query.bookings.findMany({
      with: {
        car: true,
        user: true,
        payments: true,
      },
    });
  }

  async updateBooking(id: number, data: Partial<typeof bookings.$inferInsert>) {
    const [updated] = await db
      .update(bookings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bookings.id, id)) // ✅ no callback, use eq directly
      .returning();
    return updated;
  }

  async deleteBooking(id: number) {
    await db.delete(bookings).where(eq(bookings.id, id));
    return { message: 'Booking deleted' };
  }
}
