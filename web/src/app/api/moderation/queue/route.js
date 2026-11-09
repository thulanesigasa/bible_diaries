import {handleModerationQueue,moderationCookieName} from '../../../../lib/moderation-admin.mjs';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function GET(request){return handleModerationQueue(request,(await cookies()).get(moderationCookieName())?.value);}
