import {cookies} from 'next/headers';
import {handleAdminSubscribers,adminCookieName,privateReply} from '../../../../lib/admin.mjs';
import {siteOrigin} from '../../../../lib/seo.mjs';
export const runtime='nodejs';
export async function GET(request){
 if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==siteOrigin()))return privateReply(403,{error:'Open the dashboard on this website.'});
 const raw=new URL(request.url).searchParams.get('offset')||'0';
 if(!/^\d{1,7}$/.test(raw))return privateReply(400,{error:'Invalid page.'});
 return handleAdminSubscribers((await cookies()).get(adminCookieName())?.value,Number(raw));
}
