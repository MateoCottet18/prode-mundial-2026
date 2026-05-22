import { existsSync, statSync } from "fs";
import { NextResponse } from "next/server";
import { ENV_LOCAL_PATH, PROJECT_ROOT } from "@/lib/project-root";

/** Debug: which Supabase env vars are set (never returns secret values). */
export async function GET() {
  const envLocalExists = existsSync(ENV_LOCAL_PATH);
  const envLocalSizeBytes = envLocalExists ? statSync(ENV_LOCAL_PATH).size : 0;

  console.log({
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  console.log("Expected .env.local at:", ENV_LOCAL_PATH, "| exists:", envLocalExists, "| size:", envLocalSizeBytes);
  console.log("process.cwd():", process.cwd(), "| PROJECT_ROOT:", PROJECT_ROOT);

  return NextResponse.json({
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleExists: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    envLocalExpectedPath: ENV_LOCAL_PATH,
    envLocalExists,
    envLocalSizeBytes,
    cwd: process.cwd(),
    projectRoot: PROJECT_ROOT,
  });
}
