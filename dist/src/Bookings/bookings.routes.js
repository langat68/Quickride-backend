import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bookingIdParam, createBookingSchema, updateBookingSchema, } from '../Validator.js';
import { BookingController } from './bookings.controller.js';
const bookingRouter = new Hono();
const controller = new BookingController();
bookingRouter.get('/', controller.getAll);
bookingRouter.get('/:id', zValidator('param', bookingIdParam), controller.getById);
bookingRouter.post('/', zValidator('json', createBookingSchema), controller.create);
bookingRouter.put('/:id', zValidator('param', bookingIdParam), zValidator('json', updateBookingSchema), controller.update);
bookingRouter.delete('/:id', zValidator('param', bookingIdParam), controller.delete);
export default bookingRouter;
