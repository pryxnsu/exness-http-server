import { Hono } from "hono";
import { auth } from "../../middlewares/auth.middleware";
import { executeOrder } from "./account.controller";
import { zValidator } from "@hono/zod-validator";
import { CreateOrderSchema } from "./account.types";

export const accountRouter = new Hono();

// create order
accountRouter.post('/:walletId/orders', zValidator('json', CreateOrderSchema), auth, executeOrder);

// close position
// accountRouter.put('/:walletId/position/:positionId/close', auth, closePosition);
