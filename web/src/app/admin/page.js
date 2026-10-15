import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminCookieName, getAdminUser } from '../../lib/admin.mjs';
import AdminDashboard from '../../components/AdminDashboard';
export default async function AdminPage() {
  const user = await getAdminUser((await cookies()).get(adminCookieName())?.value);
  if (!user) redirect('/admin/login');
  return <main id="main" className="wrap admin-page"><AdminDashboard email={user.email}/></main>;
}
