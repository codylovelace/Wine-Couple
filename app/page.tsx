import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CellarApp } from '@/components/CellarApp';
import { SESSION_COOKIE, getUsers, toPublicUser, userForToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await userForToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  const partner = (await getUsers()).find((u) => u.id !== user.id);
  return <CellarApp me={toPublicUser(user)} partner={partner ? toPublicUser(partner) : null} />;
}
