// Approval and publication must be one trusted operation; no standalone bypass.
export async function POST(){return Response.json({error:'Use the authenticated publishing service.'},{status:410});}
