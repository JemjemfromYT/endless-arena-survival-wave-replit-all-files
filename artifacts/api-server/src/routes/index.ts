import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import heroesRouter from "./heroes";
import leaderboardRouter from "./leaderboard";
import spRouter from "./sp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(heroesRouter);
router.use(leaderboardRouter);
router.use(spRouter);

export default router;
