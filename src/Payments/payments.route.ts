import { Hono } from "hono";
import * as paymentController from "./payments.controller.js";

const paymentRouter = new Hono();

paymentRouter.get("/", paymentController.getAll);
paymentRouter.get("/:id", paymentController.getOne);
paymentRouter.post("/", paymentController.create);
paymentRouter.post("/mpesa/initiate", paymentController.initiateMpesa);
paymentRouter.post("/mpesa/callback", paymentController.mpesaCallback);

export default paymentRouter;
