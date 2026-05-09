import { Router } from "express";
import { db, profilesTable, heroUnlocksTable, pendingPaymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const HERO_PRICE_PHP = 29;
const LOCKED_IDS = ["kagoya", "iruha", "yachiyu", "kaitu", "well"];

async function verifyProfile(name: string, pin: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.name, name))
    .limit(1);
  if (rows.length === 0) return false;
  return rows[0].pin === pin;
}

router.post("/heroes/checkout", async (req, res) => {
  try {
    const { name, pin, heroId } = req.body as {
      name?: string;
      pin?: string;
      heroId?: string;
    };
    if (!name || !pin || !heroId) {
      res.status(400).json({ error: "name, pin, heroId required." });
      return;
    }
    if (!LOCKED_IDS.includes(heroId)) {
      res.status(400).json({ error: "Hero is not a paid hero." });
      return;
    }
    if (!(await verifyProfile(name, pin))) {
      res.status(401).json({ error: "Invalid profile credentials." });
      return;
    }

    const existing = await db
      .select({ heroId: heroUnlocksTable.heroId })
      .from(heroUnlocksTable)
      .where(
        and(
          eq(heroUnlocksTable.profileName, name),
          eq(heroUnlocksTable.heroId, heroId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Hero already unlocked." });
      return;
    }

    const secretKey = process.env["PAYMONGO_SECRET_KEY"];
    if (!secretKey) {
      res.status(503).json({ error: "Payment system not configured." });
      return;
    }

    const origin = (req.headers["x-forwarded-proto"] ?? "https") + "://" + req.headers["host"];
    const successUrl = `${origin}/game/?paid=true&hero=${encodeURIComponent(heroId)}`;
    const cancelUrl = `${origin}/game/?paid=cancel`;

    const pmRes = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(secretKey + ":").toString("base64"),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: HERO_PRICE_PHP * 100,
            description: `Endless Arena — ${heroId} hero unlock`,
            remarks: `${name}|${heroId}`,
          },
        },
      }),
    });

    if (!pmRes.ok) {
      const err = await pmRes.text();
      req.log.error({ status: pmRes.status, body: err }, "PayMongo link creation failed");
      res.status(502).json({ error: "Payment provider error." });
      return;
    }

    const pmData = (await pmRes.json()) as {
      data: { id: string; attributes: { checkout_url: string } };
    };
    const linkId = pmData.data.id;
    const checkoutUrl = pmData.data.attributes.checkout_url;

    await db.insert(pendingPaymentsTable).values({
      profileName: name,
      heroId,
      paymongoLinkId: linkId,
    });

    res.json({ checkoutUrl, successUrl, cancelUrl });
  } catch (e) {
    req.log.error(e, "heroes/checkout error");
    res.status(500).json({ error: "Server error." });
  }
});

router.post("/heroes/unlock", async (req, res) => {
  try {
    const { name, pin, heroId } = req.body as {
      name?: string;
      pin?: string;
      heroId?: string;
    };
    if (!name || !pin || !heroId) {
      res.status(400).json({ error: "name, pin, heroId required." });
      return;
    }
    if (!(await verifyProfile(name, pin))) {
      res.status(401).json({ error: "Invalid profile credentials." });
      return;
    }

    const alreadyUnlocked = await db
      .select()
      .from(heroUnlocksTable)
      .where(and(eq(heroUnlocksTable.profileName, name), eq(heroUnlocksTable.heroId, heroId)))
      .limit(1);

    if (alreadyUnlocked.length === 0) {
      const secretKey = process.env["PAYMONGO_SECRET_KEY"];
      let paymentVerified = false;

      if (secretKey) {
        const pending = await db
          .select()
          .from(pendingPaymentsTable)
          .where(
            and(
              eq(pendingPaymentsTable.profileName, name),
              eq(pendingPaymentsTable.heroId, heroId),
            ),
          )
          .orderBy(pendingPaymentsTable.createdAt)
          .limit(10);

        for (const p of pending) {
          if (p.completedAt) {
            paymentVerified = true;
            break;
          }
          const pmRes = await fetch(
            `https://api.paymongo.com/v1/links/${p.paymongoLinkId}`,
            {
              headers: {
                Authorization:
                  "Basic " + Buffer.from(secretKey + ":").toString("base64"),
              },
            },
          );
          if (pmRes.ok) {
            const pmData = (await pmRes.json()) as {
              data: { attributes: { status: string } };
            };
            if (pmData.data.attributes.status === "paid") {
              paymentVerified = true;
              await db
                .update(pendingPaymentsTable)
                .set({ completedAt: new Date() })
                .where(eq(pendingPaymentsTable.id, p.id));
              break;
            }
          }
        }
      }

      if (!paymentVerified) {
        res.status(402).json({ error: "Payment not verified." });
        return;
      }

      await db
        .insert(heroUnlocksTable)
        .values({ profileName: name, heroId })
        .onConflictDoNothing();
    }

    const unlocks = await db
      .select({ heroId: heroUnlocksTable.heroId })
      .from(heroUnlocksTable)
      .where(eq(heroUnlocksTable.profileName, name));

    res.json({ name, unlockedHeroes: unlocks.map((u) => u.heroId) });
  } catch (e) {
    req.log.error(e, "heroes/unlock error");
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
