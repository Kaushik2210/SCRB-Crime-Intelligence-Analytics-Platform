import { NextResponse } from "next/server";
import { getTable } from "@/lib/zcql";
import { runSeed } from "../../../../scripts/seed";

/**
 * Runs the synthetic-data seed against the real Catalyst Data Store.
 *
 * This exists because the CLI seed path (scripts/seed.js) needs OAuth
 * self-client credentials that aren't configured for this project; running
 * inside a Catalyst-served request reuses the per-request app that server.js
 * binds, which needs no extra credentials.
 *
 * Guarded by a shared secret so it can't be triggered by anyone who happens to
 * reach the URL. Delete this route (and SEED_SECRET) once the data is loaded.
 */
export const maxDuration = 300;

export async function POST(request) {
  const expected = process.env.SEED_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "SEED_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("x-seed-secret") !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = [];
  const log = (line) => {
    logs.push(String(line));
    console.log(line);
  };

  try {
    const result = await runSeed({ getTable, log });
    return NextResponse.json({ ok: true, ...result, logs });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err), stack: err?.stack, logs },
      { status: 500 }
    );
  }
}
