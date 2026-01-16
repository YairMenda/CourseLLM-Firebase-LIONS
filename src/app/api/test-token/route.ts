import { NextResponse } from "next/server";

// Guard this route so it's only available during test runs.
const ENABLED = process.env.ENABLE_TEST_AUTH === "true";

export async function GET(req: Request) {
  if (!ENABLED) return NextResponse.json({ error: "test auth disabled" }, { status: 403 });

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") || `test-${Math.random().toString(36).slice(2, 8)}`;
  const role = url.searchParams.get("role") || "student";
  const createProfile = url.searchParams.get("createProfile") !== "false";

  // Return a mock token containing test user info
  // The test/signin page will handle creating the user and profile
  const mockToken = Buffer.from(
    JSON.stringify({ uid, role, createProfile, test: true })
  ).toString("base64");

  return NextResponse.json({ token: mockToken, uid, role });
}
