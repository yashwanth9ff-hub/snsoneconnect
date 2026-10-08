'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Shell from '@/components/Shell';
import { Loading } from '@/components/ui';

const LINKS = [
  { href: '/app', label: 'Home', exact: true },
  { href: '/app/upcoming', label: 'Upcoming' },
  { href: '/app/requests', label: 'Requests' },
];

export default function StudentLayout({ children }) {
  const { loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace('/login');
    else if (profile.role !== 'student') router.replace('/staff');
  }, [loading, profile, router]);

  if (loading || !profile || profile.role !== 'student') return <Loading />;
  return <Shell links={LINKS}>{children}</Shell>;
}
