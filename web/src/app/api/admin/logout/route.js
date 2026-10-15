import { cookies } from 'next/headers';
import { handleAdminLogout, adminCookieName } from '../../../../lib/admin.mjs';
export const runtime = 'nodejs';
export async function POST(request) { return handleAdminLogout(request, (await cookies()).get(adminCookieName())?.value); }
