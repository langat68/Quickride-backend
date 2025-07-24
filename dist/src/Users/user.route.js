import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createUserSchema } from '../Validator.js';
import { UserController } from './user.controller.js';
const userRouter = new Hono();
const controller = new UserController();
//Zod validation to POST and PUT
userRouter.post('/', zValidator('json', createUserSchema), (c) => controller.create(c));
userRouter.get('/', (c) => controller.getAll(c));
userRouter.get('/:id', (c) => controller.getById(c));
userRouter.put('/:id', zValidator('json', createUserSchema), (c) => controller.update(c));
userRouter.delete('/:id', (c) => controller.delete(c));
export default userRouter;
