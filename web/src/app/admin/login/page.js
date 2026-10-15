import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminCookieName, getAdminUser, adminConfiguration } from '../../../lib/admin.mjs';
import AdminLogin from '../../../components/AdminLogin';
export const metadata = { title:'Admin Sign-in', robots:{index:false,follow:false} };
export default async function LoginPage() {
  if (await getAdminUser((await cookies()).get(adminCookieName())?.value)) redirect('/admin');
  return <main id="main" className="wrap admin-login-page"><div><p className="kicker">BIBLE DIARIES / ADMINISTRATION</p><h1>Keep an eye on<br/>the next chapter.</h1><p>Sign in to monitor waiting-list growth and platform preferences.</p><a className="text-link" href="/">Back to the website ↗</a></div><AdminLogin configured={Boolean(adminConfiguration())}/></main>;
}
