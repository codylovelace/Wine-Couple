import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { SESSION_COOKIE, getUsers, userForToken } from '@/lib/auth';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await userForToken((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/');
  const users = await getUsers();
  if (users.length === 0) {
    // First run: suggest the partner names already used in the cellar so each
    // person's account lines up with their existing reviews.
    const settings = await getSettings();
    return <LoginScreen mode="setup" names={[settings.partner1Name, settings.partner2Name]} />;
  }
  return <LoginScreen mode="login" names={users.map((u) => u.name)} />;
}
