"use client";
import { useState } from "react";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onForgotPassword }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await onForgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl border border-slate-100">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Reset Password</h1>
            <p className="text-slate-500 text-sm font-medium">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {forgotSent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <p className="font-black text-slate-800 mb-2">Check your email!</p>
              <p className="text-slate-500 text-sm mb-6">
                We sent a password reset link to {forgotEmail}
              </p>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); }}
                className="text-indigo-600 font-black text-sm hover:text-indigo-700"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                  <p className="text-rose-600 text-sm font-bold">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Email</label>
                <input
                  required
                  type="email"
                  className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl border border-slate-100">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-1">Creative Ops</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Sign in to your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
            <p className="text-rose-600 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
              Email
            </label>
            <input
              required
              type="email"
              className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
              Password
            </label>
            <input
              required
              type="password"
              className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 mt-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Forgot password */}
        <div className="mt-4 text-center">
          <button
            onClick={() => { setShowForgot(true); setError(""); }}
            className="text-slate-400 font-bold text-sm hover:text-indigo-600 transition-colors"
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </div>
  );
}
