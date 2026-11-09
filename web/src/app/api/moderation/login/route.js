import {handleModerationLogin,moderationCookieName} from '../../../../lib/moderation-admin.mjs';
export const runtime='nodejs';
export async function POST(request){return handleModerationLogin(request);}
