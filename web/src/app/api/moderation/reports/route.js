import { cookies } from "next/headers";
import {
  handleSafetyReports,
  moderationCookieName,
} from "../../../../lib/moderation-admin.mjs";
export const runtime = "nodejs";
export async function GET(request) {
  return handleSafetyReports(
    request,
    (await cookies()).get(moderationCookieName())?.value,
  );
}
export async function POST(request) {
  return handleSafetyReports(
    request,
    (await cookies()).get(moderationCookieName())?.value,
  );
}
