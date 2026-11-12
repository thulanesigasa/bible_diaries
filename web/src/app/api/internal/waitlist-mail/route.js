import {handleMailCron} from '../../../../lib/waitlist-mail.mjs';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){return handleMailCron(request);}
