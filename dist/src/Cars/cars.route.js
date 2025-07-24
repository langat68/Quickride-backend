// src/Cars/car.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CarService } from "./cars.service.js";
import { CarController } from "./cars.controller.js";
import { createCarSchema, updateCarSchema, carIdParam, } from "../Validator.js";
export const carRouter = new Hono();
const service = new CarService();
const controller = new CarController(service);
// 🔹 Routes
carRouter.get("/", controller.getAllCars);
carRouter.get("/:id", zValidator("param", carIdParam), controller.getCarById);
carRouter.post("/", zValidator("json", createCarSchema), controller.createCar);
carRouter.put("/:id", zValidator("param", carIdParam), zValidator("json", updateCarSchema), controller.updateCar);
carRouter.delete("/:id", zValidator("param", carIdParam), controller.deleteCar);
