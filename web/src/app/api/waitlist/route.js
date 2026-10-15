import { handleWaitlist } from '../../../lib/waitlist.mjs';
export const runtime = 'nodejs';
export const maxDuration = 15;
export async function POST(request) { return handleWaitlist(request); }
