"use client";
import { useState } from "react";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onForgotPassword }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="min-h-screen bg-[#f8faf9] flex">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ backgroundColor: "#166534" }}>
          <div className="absolute inset-0 z-0">
            <img src="/ewan.png" alt="" className="w-full h-full object-cover opacity-20" />
          </div>
          <div className="absolute inset-0 z-0 bg-green-800/60" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-sm">C</div>
            <span className="font-black text-white text-lg">Creative Ops</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Reset your<br />password
            </h2>
            <p className="text-green-200 font-medium text-sm leading-relaxed">
              Enter your email and we'll send you a link to get back into your account.
            </p>
          </div>
          <p className="text-green-300 text-xs font-medium">© 2025 Creative Ops. All rights reserved.</p>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-gray-900 mb-2">Reset Password</h1>
              <p className="text-gray-500 text-sm">We'll send a reset link to your email</p>
            </div>

            {forgotSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📧</span>
                </div>
                <p className="font-black text-gray-900 mb-2">Check your inbox!</p>
                <p className="text-gray-500 text-sm mb-6">We sent a reset link to {forgotEmail}</p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); }}
                  className="text-green-700 font-black text-sm hover:text-green-800 transition-colors"
                >
                  ← Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm font-bold">{error}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-1.5 uppercase tracking-widest">Email Address</label>
                  <input
                    required
                    type="email"
                    className="w-full border border-gray-200 bg-white p-3.5 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-gray-300"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-green-700 text-white py-3.5 rounded-xl font-black text-sm hover:bg-green-800 transition-all shadow-sm disabled:opacity-50"
                >
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-full text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors py-2"
                >
                  ← Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ backgroundColor: "#166534" }}>
          {/* Background image */}
          <div className="absolute inset-0 z-0">
            <img src="/ewan.png" alt="" className="w-full h-full object-cover opacity-20" />
          </div>
          {/* Green overlay on top of image */}
          <div className="absolute inset-0 z-0 bg-green-800/60" />

          {/* All content sits on top */}
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-sm">C</div>
              <span className="font-black text-white text-lg">Creative Ops</span>
            </div>

            <div>
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: "Active Ads", value: "24+" },
                    { label: "Hit Rate", value: "38%" },
                    { label: "Team Members", value: "8" },
                    { label: "In Testing", value: "12" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/10 rounded-2xl p-4">
                      <p className="text-3xl font-black text-white">{stat.value}</p>
                      <p className="text-green-200 text-[11px] font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <h2 className="text-4xl font-black text-white leading-tight mb-4">
                Your creative<br />pipeline, simplified.
              </h2>
              <p className="text-green-200 font-medium text-sm leading-relaxed">
                Manage your entire ad production workflow from brief to deployment — all in one place.
              </p>
            </div>

            <p className="text-green-300 text-xs font-medium">© 2025 Creative Ops. All rights reserved.</p>
          </div>
        </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center font-black text-white text-xs">C</div>
            <span className="font-black text-gray-900">Creative Ops</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome back 👋</h1>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-600 mb-1.5 uppercase tracking-widest">Email Address</label>
              <input
                required
                type="email"
                className="w-full border border-gray-200 bg-white p-3.5 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-gray-300"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-600 mb-1.5 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  className="w-full border border-gray-200 bg-white p-3.5 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-gray-300 pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-green-700" />
                <span className="text-sm text-gray-500 font-medium">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setError(""); }}
                className="text-green-700 font-bold text-sm hover:text-green-800 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-black text-sm hover:bg-green-800 transition-all shadow-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}