// src/Cars/car.controller.ts
import { CarService } from "./cars.service.js";
import { HTTPException } from "hono/http-exception";

export class CarController {
  constructor(private service: CarService) {}

  createCar = async (c: any) => {
    const car = await this.service.createCar(c.req.valid("json"));
    return c.json(car, 201);
  };

  getAllCars = async (c: any) => {
    const query = c.req.query();
    const filters = {
      location: query.location,
      isAvailable: query.isAvailable === "true" ? true : query.isAvailable === "false" ? false : undefined,
      category: query.category,
      seats: query.seats ? Number(query.seats) : undefined,
    };

    const cars = await this.service.getAllCars(filters);
    return c.json(cars);
  };

  getCarById = async (c: any) => {
    const id = Number(c.req.param("id"));
    const car = await this.service.getCarById(id);
    if (!car) throw new HTTPException(404, { message: "Car not found" });
    return c.json(car);
  };

  updateCar = async (c: any) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    const updated = await this.service.updateCar(id, data);
    if (!updated) throw new HTTPException(404, { message: "Car not found" });
    return c.json(updated);
  };

  deleteCar = async (c: any) => {
    const id = Number(c.req.param("id"));
    const deleted = await this.service.deleteCar(id);
    if (!deleted) throw new HTTPException(404, { message: "Car not found" });
    return c.json({ message: "Car deleted" });
  };
}
