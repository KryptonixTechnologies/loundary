import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

export default function LoginPage() {
  const { login, error, clearError, sessionExpired } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) return;

    setSubmitting(true);

    const result = await login(email.trim(), password);

    if (result.success) {
      window.location.href = '/admin';
    }

    setSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Open Doors</h1>
          <p>Laundromat POS</p>
        </div>

        <div className="login-content">
          <h2>Welcome back</h2>
          <p className="login-subtitle">
            Sign in to access the administration dashboard.
          </p>

          {sessionExpired && (
            <div className="login-message warning">
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="login-message error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <p>Open Doors Laundromat</p>
        </div>
      </div>
    </div>
  );
}