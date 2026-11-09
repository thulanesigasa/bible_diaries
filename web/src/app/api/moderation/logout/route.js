import {handleModerationLogout,moderationCookieName} from '../../../../lib/moderation-admin.mjs';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request){return handleModerationLogout(request,(await cookies()).get(moderationCookieName())?.value);}
