import {cookies} from 'next/headers';
import {redirect,notFound} from 'next/navigation';
import {moderationEnabled} from '../../../lib/deployment.mjs';
import {getModeratorUser,moderationCookieName} from '../../../lib/moderation-admin.mjs';
import ModerationDashboard from '../../../components/ModerationDashboard';
export const metadata={title:'Moderation dashboard',robots:{index:false,follow:false}};
export default async function Page(){if(!moderationEnabled())notFound();const user=await getModeratorUser((await cookies()).get(moderationCookieName())?.value);if(!user)redirect('/admin/moderation/login');return <main id="main" className="wrap admin-page"><ModerationDashboard email={user.email}/></main>;}
