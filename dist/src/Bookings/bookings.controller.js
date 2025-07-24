import { BookingService } from './bookings.service.js';
import { CarService } from '../Cars/cars.service.js';
import { nanoid } from 'nanoid';
export class BookingController {
    service;
    carService;
    constructor(service = new BookingService(), carService = new CarService()) {
        this.service = service;
        this.carService = carService;
    }
    create = async (c) => {
        const body = await c.req.json();
        const { carId, pickupDate, returnDate } = body;
        const car = await this.carService.getCarById(carId);
        if (!car)
            return c.json({ message: 'Car not found' }, 404);
        const start = new Date(pickupDate);
        const end = new Date(returnDate);
        const durationMs = end.getTime() - start.getTime();
        const days = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        const totalAmount = Number(car.pricePerDay) * days;
        const bookingReference = `BOOK-${nanoid(10)}`;
        const newBooking = await this.service.createBooking({
            ...body,
            pickupDate: start, // ✅ Ensure JS Date
            returnDate: end, // ✅ Ensure JS Date
            totalAmount,
            bookingReference,
        });
        return c.json(newBooking, 201);
    };
    getById = async (c) => {
        const id = Number(c.req.param('id'));
        const booking = await this.service.getBookingById(id);
        if (!booking)
            return c.notFound();
        return c.json(booking);
    };
    getAll = async (c) => {
        const bookings = await this.service.getAllBookings();
        return c.json(bookings);
    };
    update = async (c) => {
        const id = Number(c.req.param('id'));
        const body = await c.req.json();
        // Optional: Convert dates if updating
        if (body.pickupDate)
            body.pickupDate = new Date(body.pickupDate);
        if (body.returnDate)
            body.returnDate = new Date(body.returnDate);
        const updated = await this.service.updateBooking(id, body);
        return c.json(updated);
    };
    delete = async (c) => {
        const id = Number(c.req.param('id'));
        const result = await this.service.deleteBooking(id);
        return c.json(result);
    };
}
