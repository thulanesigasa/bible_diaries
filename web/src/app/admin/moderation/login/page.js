import {cookies} from 'next/headers';
import {redirect,notFound} from 'next/navigation';
import {moderationEnabled} from '../../../../lib/deployment.mjs';
import {getModeratorUser,moderationCookieName,moderationConfiguration} from '../../../../lib/moderation-admin.mjs';
import AdminLogin from '../../../../components/AdminLogin';
export const metadata={title:'Moderator sign-in',robots:{index:false,follow:false}};
export default async function Page(){if(!moderationEnabled())notFound();if(await getModeratorUser((await cookies()).get(moderationCookieName())?.value))redirect('/admin/moderation');return <main id="main" className="wrap admin-login-page"><div><p className="kicker">BIBLE DIARIES / COMMUNITY CARE</p><h1>Review with care.<br/>Respond with a reason.</h1><p>Only accounts assigned a moderation role can review held submissions and appeals. Waiting-list administrator access does not grant this role.</p><p>Pending content stays unpublished. Ordinary moderators cannot read private entries or chats.</p><a className="text-link" href="/">Back to Bible Diaries ↗</a></div><AdminLogin configured={Boolean(moderationConfiguration())} moderation/></main>;}
