'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        // Sign in with email and password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Redirect to dashboard on successful login
        router.push('/dashboard');
        router.refresh(); // Force a refresh to update the auth state
      } else {
        // Sign up with email and password
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        // Show confirmation message or redirect
        router.push('/email-confirmation');
      }
    } catch (err: unknown) {
      setError(typeof err === 'object' && err && 'message' in err && typeof err.message === 'string' 
        ? err.message 
        : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-sky-600">BridgeCare</h1>
          <p className="mt-2 text-gray-600">Your AI medical assistant</p>
        </div>

        <div className="mb-6 flex rounded-md">
          <button
            onClick={() => setMode('signin')}
            className={`w-1/2 py-2 text-center ${
              mode === 'signin'
                ? 'bg-sky-100 text-sky-700 font-medium'
                : 'bg-gray-50 text-gray-500'
            } rounded-l-md transition-colors`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`w-1/2 py-2 text-center ${
              mode === 'signup'
                ? 'bg-sky-100 text-sky-700 font-medium'
                : 'bg-gray-50 text-gray-500'
            } rounded-r-md transition-colors`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 py-3 text-white font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors disabled:bg-sky-300"
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGuestAccess}
              className="w-full rounded-md border border-gray-300 bg-white py-3 text-sky-600 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          By using BridgeCare, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
