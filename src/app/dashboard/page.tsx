'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MicrophoneIcon, PencilIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Define a User type with the properties we need
type User = {
  email?: string;
  id?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Check for user session on component mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Force a refresh to update the auth state
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-sky-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-sky-600">BridgeCare</h1>
          
          <div className="flex items-center">
            <span className="hidden sm:block mr-2 max-w-[120px] sm:max-w-[200px] truncate text-sm text-gray-600">
              {user ? user.email : 'Guest User'}
            </span>
            
            <button
              onClick={handleSignOut}
              className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <UserCircleIcon className="mr-1 h-5 w-5" />
              <span className="sm:hidden">{user ? 'Sign Out' : 'Sign In'}</span>
              <span className="hidden sm:inline">{user ? 'Sign Out' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-medium text-gray-900">How would you like to consult with BridgeCare?</h2>
          <p className="mt-2 text-gray-600">Choose your preferred method of communication</p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <Link href="/voice-agent" className="w-full">
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-sky-100 bg-white p-6 shadow-sm transition-all hover:border-sky-200 hover:shadow-md">
              <MicrophoneIcon className="h-16 w-16 text-sky-500" />
              <h3 className="mt-4 font-medium text-gray-900">Voice Consultation</h3>
              <p className="mt-1 text-center text-sm text-gray-500">Speak directly with our AI medical assistant</p>
            </div>
          </Link>

          <Link href="/text-agent" className="w-full">
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-6 shadow-sm transition-all hover:border-sky-200 hover:shadow-md">
              <PencilIcon className="h-16 w-16 text-sky-600" />
              <h3 className="mt-4 font-medium text-gray-900">Text Consultation</h3>
              <p className="mt-1 text-center text-sm text-gray-500">Chat with our AI medical assistant</p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Your personal health data is kept private and secure</p>
        </div>
      </main>
    </div>
  );
} 