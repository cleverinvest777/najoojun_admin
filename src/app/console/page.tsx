'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ConsolePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/users');
  }, [router]);

  return null;
}