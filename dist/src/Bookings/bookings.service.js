import { db } from '../db/db.js';
import { bookings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
export class BookingService {
    async createBooking(data) {
        const [newBooking] = await db.insert(bookings).values(data).returning();
        return newBooking;
    }
    async getBookingById(id) {
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
    async updateBooking(id, data) {
        const [updated] = await db
            .update(bookings)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(bookings.id, id)) // ✅ no callback, use eq directly
            .returning();
        return updated;
    }
    async deleteBooking(id) {
        await db.delete(bookings).where(eq(bookings.id, id));
        return { message: 'Booking deleted' };
    }
}
