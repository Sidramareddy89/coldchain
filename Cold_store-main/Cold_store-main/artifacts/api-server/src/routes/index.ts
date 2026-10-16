import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dataclawRouter from "./dataclaw";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dataclaw", dataclawRouter);

export default router;
