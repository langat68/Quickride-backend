import { db } from '../db/db.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export class UserService {
  createUser(data: typeof users.$inferInsert) {
    return db.insert(users).values(data).returning()
  }

  getAllUsers() {
    return db.select().from(users)
  }

  getUserById(id: number) {
    return db.select().from(users).where(eq(users.id, id))
  }

  updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
    return db.update(users).set(data).where(eq(users.id, id)).returning()
  }

  deleteUser(id: number) {
    return db.delete(users).where(eq(users.id, id)).returning()
  }
}