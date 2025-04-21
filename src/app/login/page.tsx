"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      console.log(`Attempting ${isSignUp ? 'signup' : 'login'} with:`, { email: trimmedEmail });
      
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password.trim(),
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password.trim(),
        });
      }

      const { data, error } = result;
      console.log("Auth result:", { data, error });

      if (error) throw error;

      if (isSignUp && data?.user) {
        setSuccess("Please check your email for verification link");
      } else if (!isSignUp && data?.session) {
        setSuccess("Success! Redirecting...");
        // Force a hard redirect to /home with a random parameter to bypass cache
        setTimeout(() => {
          const timestamp = new Date().getTime();
          window.location.replace(`/home?t=${timestamp}`);
        }, 1000);
      } else {
        setError(`${isSignUp ? 'Sign up' : 'Login'} failed - please try again`);
      }
    } catch (error) {
      console.error(`${isSignUp ? 'Sign up' : 'Login'} error:`, error);
      setError(error instanceof Error ? error.message : `An error occurred during ${isSignUp ? 'sign up' : 'login'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}