import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
export class UserService {
    createUser(data) {
        return db.insert(users).values(data).returning();
    }
    getAllUsers() {
        return db.select().from(users);
    }
    getUserById(id) {
        return db.select().from(users).where(eq(users.id, id));
    }
    updateUser(id, data) {
        return db.update(users).set(data).where(eq(users.id, id)).returning();
    }
    deleteUser(id) {
        return db.delete(users).where(eq(users.id, id)).returning();
    }
}
