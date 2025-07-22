import type { Context } from 'hono'

import { UserService } from './user.service.js'

const userService = new UserService()

export class UserController {
  async create(c: Context) {
    const body = await c.req.json()
    const user = await userService.createUser(body)
    return c.json(user[0], 201)
  }

  async getAll(c: Context) {
    const users = await userService.getAllUsers()
    return c.json(users)
  }

  async getById(c: Context) {
    const id = Number(c.req.param('id'))
    const user = await userService.getUserById(id)
    if (!user.length) return c.notFound()
    return c.json(user[0])
  }

  async update(c: Context) {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const updated = await userService.updateUser(id, body)
    return c.json(updated[0])
  }

  async delete(c: Context) {
    const id = Number(c.req.param('id'))
    const deleted = await userService.deleteUser(id)
    return c.json(deleted[0])
  }
}