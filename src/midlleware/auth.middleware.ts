import type { MiddlewareHandler } from 'hono'
import { verifyToken } from '../Auth/utils/jwt.js'

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    c.set('user', user) // Set in context for later
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 403)
  }
}