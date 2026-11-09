import {redirect} from 'next/navigation';
import ModerationReviews from '../../../components/ModerationReviews';
export default function Dashboard(){if(process.env.ADMIN_SITE_URL){const u=new URL(process.env.ADMIN_SITE_URL);if((u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))||!['https:','http:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Invalid main website origin');redirect(`${u.origin}/admin/moderation`);}return <ModerationReviews moderator/>;}
