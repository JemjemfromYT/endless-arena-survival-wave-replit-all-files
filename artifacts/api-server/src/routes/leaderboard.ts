import { Router } from "express";
import { db, leaderboardTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res) => {
  try {
    const entries = await db
      .select({
        name: leaderboardTable.name,
        score: sql<number>`sum(${leaderboardTable.score})`,
      })
      .from(leaderboardTable)
      .groupBy(leaderboardTable.name)
      .orderBy(desc(sql`sum(${leaderboardTable.score})`))
      .limit(50);
    res.json({ entries: entries.map(e => ({ name: e.name, score: Number(e.score) || 0 })) });
  } catch (e) {
    req.log.error(e, "leaderboard GET error");
    res.status(500).json({ error: "Server error." });
  }
});

router.post("/leaderboard", async (req, res) => {
  try {
    const { name, hero, score, wave, mode, time } = req.body as {
      name?: string;
      hero?: string;
      score?: number;
      wave?: number;
      mode?: string;
      time?: string;
    };
    if (!name || !hero || typeof score !== "number") {
      res.status(400).json({ error: "name, hero, score required." });
      return;
    }
    const entry = await db
      .insert(leaderboardTable)
      .values({
        name: String(name).slice(0, 24),
        hero: String(hero).slice(0, 24),
        score: Math.max(0, Math.floor(score)),
        wave: typeof wave === "number" ? Math.max(0, Math.floor(wave)) : 0,
        mode: String(mode || "single").slice(0, 16),
        time: String(time || "").slice(0, 32),
      })
      .returning();
    res.json({ entry: entry[0] });
  } catch (e) {
    req.log.error(e, "leaderboard POST error");
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
