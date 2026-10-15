import { handleAdminLogin } from '../../../../lib/admin.mjs';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request) { return handleAdminLogin(request); }
