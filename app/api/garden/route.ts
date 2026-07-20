import { NextResponse } from "next/server";

const message =
  "Die alte V0.3-OpenAI-Gartenroute wurde in AL Green Design V1.0.3 deaktiviert.";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      version: "1.0.3",
      legacyRouteDisabled: true,
      message
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      version: "1.0.3",
      legacyRouteDisabled: true,
      message
    },
    { status: 410 }
  );
}
