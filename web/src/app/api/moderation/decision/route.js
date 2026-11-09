import {handleModerationDecision,moderationCookieName} from '../../../../lib/moderation-admin.mjs';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request){return handleModerationDecision(request,(await cookies()).get(moderationCookieName())?.value);}
