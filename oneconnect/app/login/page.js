'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { loading, profile, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && profile) router.replace(profile.role === 'student' ? '/app' : '/staff');
  }, [loading, profile, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    clearAuthError();
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(
        /invalid/i.test(err.message)
          ? 'Incorrect email or password.'
          : 'Could not sign in. Check your connection and try again.'
      );
    }
  }

  const message = error || authError;

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">
          SNS <span>OneConnect</span>
        </h1>
        <p className="muted">Sign in to see your announcements, deadlines and requests.</p>

        <form onSubmit={onSubmit} className="form" noValidate>
          <label className="field">
            <span>College email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-row">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {message ? (
            <div className="banner banner-error" role="alert">
              {message}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
