import { Link } from "wouter";

export default function Cancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-2xl text-slate-400">
          ✕
        </div>
        <h1 className="text-xl font-semibold text-white">Payment Cancelled</h1>
        <p className="mt-2 text-sm text-slate-400">
          No charge was made. You can try again anytime from inside the game.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/game/index.html"
            className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-5 py-3 text-sm font-medium text-white hover:bg-violet-600"
          >
            Return to Game
          </a>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
