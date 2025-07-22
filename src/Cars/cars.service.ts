// src/Cars/car.service.ts
import { db } from "../db/db.js";
import { cars } from "../db/schema.js";
import { and, eq, ilike, sql, gte } from "drizzle-orm";

export class CarService {
  async createCar(data: typeof cars.$inferInsert) {
    const [newCar] = await db.insert(cars).values(data).returning();
    return newCar;
  }

  async getAllCars(filters: {
    location?: string;
    isAvailable?: boolean;
    category?: string;
    seats?: number;
  }) {
    const conditions = [];

    if (filters.location) {
      conditions.push(ilike(cars.location, `%${filters.location}%`));
    }

    if (typeof filters.isAvailable === "boolean") {
      conditions.push(eq(cars.isAvailable, filters.isAvailable));
    }

    if (filters.category) {
      conditions.push(ilike(cars.category, `%${filters.category}%`));
    }

    if (filters.seats) {
      conditions.push(gte(cars.seats, filters.seats));
    }

    return await db
      .select()
      .from(cars)
      .where(conditions.length ? and(...conditions) : undefined);
  }

  async getCarById(id: number) {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car;
  }

  async updateCar(id: number, data: Partial<typeof cars.$inferInsert>) {
    const [updatedCar] = await db
      .update(cars)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cars.id, id))
      .returning();
    return updatedCar;
  }

  async deleteCar(id: number) {
    const [deletedCar] = await db.delete(cars).where(eq(cars.id, id)).returning();
    return deletedCar;
  }
}
