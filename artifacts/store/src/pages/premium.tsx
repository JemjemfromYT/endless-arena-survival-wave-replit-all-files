import { Link } from "wouter";

const HEROES = [
  { id: "kagoya", name: "Kagoya", price: 29 },
  { id: "iruha", name: "Iruha", price: 29 },
  { id: "yachiyu", name: "Yachiyu", price: 29 },
  { id: "kaitu", name: "Kaitu", price: 29 },
  { id: "well", name: "Well", price: 29 },
];

export default function Premium() {
  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-violet-400">Hero Store</h1>
        </div>
        <p className="text-slate-400 mb-6 text-sm">
          Unlock premium heroes for ₱29 each — saved permanently to your profile.
          Log in inside the game first, then come back here to purchase.
        </p>
        <div className="grid gap-4">
          {HEROES.map((hero) => (
            <div
              key={hero.id}
              className="rounded-xl border border-slate-700 bg-slate-800 p-5 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white">{hero.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">Premium Hero</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-violet-300">₱{hero.price}</span>
                <a
                  href={`/game/index.html#buy-${hero.id}`}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
                >
                  Buy in Game
                </a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500 text-center">
          Payments processed securely via PayMongo (GCash, card, Maya)
        </p>
      </div>
    </div>
  );
}
