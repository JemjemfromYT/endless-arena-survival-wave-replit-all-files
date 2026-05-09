import { Router } from "express";
import { db, profilesTable, leaderboardTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/sp", async (req, res) => {
  const { name } = req.query as { name?: string };
  if (!name) {
    res.status(400).json({ error: "name required." });
    return;
  }
  try {
    const trimmedName = String(name).trim();

    const [lbRow] = await db
      .select({ total: sql<number>`coalesce(sum(${leaderboardTable.score}),0)` })
      .from(leaderboardTable)
      .where(eq(leaderboardTable.name, trimmedName));

    const [profRow] = await db
      .select({ sp: profilesTable.sp })
      .from(profilesTable)
      .where(eq(profilesTable.name, trimmedName))
      .limit(1);

    const lbTotal  = Number(lbRow?.total  ?? 0);
    const killBonus = Number(profRow?.sp    ?? 0);
    res.json({ sp: lbTotal + killBonus });
  } catch (e) {
    req.log.error(e, "sp GET error");
    res.status(500).json({ error: "Server error." });
  }
});

router.post("/sp/add", async (req, res) => {
  const { name, amount } = req.body as { name?: string; amount?: number };
  if (!name || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "name and positive amount required." });
    return;
  }
  try {
    const trimmedName = String(name).slice(0, 24);
    const rows = await db
      .update(profilesTable)
      .set({ sp: sql`${profilesTable.sp} + ${Math.floor(amount)}` })
      .where(eq(profilesTable.name, trimmedName))
      .returning({ sp: profilesTable.sp });
    if (rows.length === 0) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }
    const [lbRow] = await db
      .select({ total: sql<number>`coalesce(sum(${leaderboardTable.score}),0)` })
      .from(leaderboardTable)
      .where(eq(leaderboardTable.name, trimmedName));
    const lbTotal = Number(lbRow?.total ?? 0);
    res.json({ sp: lbTotal + rows[0].sp });
  } catch (e) {
    req.log.error(e, "sp POST error");
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
