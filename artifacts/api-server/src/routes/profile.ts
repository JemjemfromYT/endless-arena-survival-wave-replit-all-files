import { Router } from "express";
import { db, profilesTable, heroUnlocksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ALL_HEROES = ["kagoya", "iruha", "yachiyu", "kaitu", "well"];
const ADMIN_ACCOUNTS = ["Jem"];

router.post("/profile/login", async (req, res) => {
  try {
    const { name, pin } = req.body as { name?: string; pin?: string };
    if (!name || !pin) {
      res.status(400).json({ error: "Name and PIN are required." });
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      res.status(400).json({ error: "PIN must be 4–8 digits." });
      return;
    }
    const trimmedName = name.trim().slice(0, 24);
    if (!trimmedName) {
      res.status(400).json({ error: "Name cannot be blank." });
      return;
    }

    const existing = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.name, trimmedName))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].pin !== pin) {
        res.status(401).json({ error: "Wrong PIN for that name." });
        return;
      }
    } else {
      await db.insert(profilesTable).values({ name: trimmedName, pin });
    }

    if (ADMIN_ACCOUNTS.includes(trimmedName)) {
      for (const heroId of ALL_HEROES) {
        await db
          .insert(heroUnlocksTable)
          .values({ profileName: trimmedName, heroId })
          .onConflictDoNothing();
      }
    }

    const unlocks = await db
      .select({ heroId: heroUnlocksTable.heroId })
      .from(heroUnlocksTable)
      .where(eq(heroUnlocksTable.profileName, trimmedName));

    res.json({ name: trimmedName, unlockedHeroes: unlocks.map((u) => u.heroId) });
  } catch (e) {
    req.log.error(e, "profile/login error");
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
