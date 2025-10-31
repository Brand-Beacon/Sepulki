'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const router = useRouter();
  const { smith, loading } = useAuth();

  useEffect(() => {
    // Prevent multiple redirects
    if (loading) return; // Wait for auth to finish loading
    
    // Use replace instead of push to avoid back button issues
    if (smith) {
      // Authenticated users go to fleet dashboard
      router.replace('/fleet');
    } else {
      // Unauthenticated users go to signin page
      router.replace('/auth/signin');
    }
  }, [smith, loading, router]);

  // Show loading state while determining where to redirect
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
