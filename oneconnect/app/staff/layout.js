'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Shell from '@/components/Shell';
import { Loading } from '@/components/ui';

const LINKS = [
  { href: '/staff/requests', label: 'Requests' },
  { href: '/staff/announcements/new', label: 'New announcement' },
];

export default function StaffLayout({ children }) {
  const { loading, profile } = useAuth();
  const router = useRouter();
  const isStaff = profile && (profile.role === 'faculty' || profile.role === 'admin');

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace('/login');
    else if (!isStaff) router.replace('/app');
  }, [loading, profile, isStaff, router]);

  if (loading || !isStaff) return <Loading />;
  return <Shell links={LINKS}>{children}</Shell>;
}
