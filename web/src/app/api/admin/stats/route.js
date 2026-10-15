import { cookies } from 'next/headers';
import { handleAdminStats, adminCookieName, privateReply } from '../../../../lib/admin.mjs';
import { siteOrigin } from '../../../../lib/seo.mjs';
export const runtime = 'nodejs';
export async function GET(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== siteOrigin())) return privateReply(403, { error:'Please open the dashboard on this website.' });
  return handleAdminStats((await cookies()).get(adminCookieName())?.value);
}
