'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Loading } from '@/components/ui';

export default function Index() {
  const { loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace('/login');
    else router.replace(profile.role === 'student' ? '/app' : '/staff');
  }, [loading, profile, router]);

  return <Loading />;
}
