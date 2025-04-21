'use client';

import Link from 'next/link';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function EmailConfirmation() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sky-100">
          <EnvelopeIcon className="h-12 w-12 text-sky-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        
        <p className="mt-4 text-gray-600">
          We&apos;ve sent a confirmation link to your email address. Please check your inbox and click the link to activate your account.
        </p>
        
        <div className="mt-8 rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            If you don&apos;t see the email, check your spam folder or try signing in with your credentials.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link 
            href="/"
            className="block w-full rounded-md bg-sky-600 px-4 py-3 text-center font-medium text-white hover:bg-sky-700 transition-colors"
          >
            Return to Sign In
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-center font-medium text-sky-600 hover:bg-gray-50 transition-colors"
          >
            Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
} 