import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { createUserSchema, loginSchema, googleLoginSchema } from '../Validator.js' 

const authRouter = new Hono()
const service = new AuthService()
const controller = new AuthController(service)

authRouter.post('/signup', zValidator('json', createUserSchema), controller.signup)
authRouter.post('/login', zValidator('json', loginSchema), controller.login)
// ✅ NEW: Google OAuth login endpoint
authRouter.post('/google', zValidator('json', googleLoginSchema), controller.googleLogin)

export default authRouter