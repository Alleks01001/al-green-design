import { NextResponse } from "next/server";
import {
  STUDIO_BUILD_LABEL,
  STUDIO_PACKAGE_VERSION,
  STUDIO_SCHEMA_VERSION,
  STUDIO_VERSION
} from "@/core/platform/version";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    application: "AL Green Design Studio",
    studioVersion: STUDIO_VERSION,
    packageVersion: STUDIO_PACKAGE_VERSION,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    build: STUDIO_BUILD_LABEL
  });
}
