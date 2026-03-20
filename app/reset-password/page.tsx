"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Handle the token from the URL
    supabase.auth.getSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Redirect to home after 2 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl border border-slate-100 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Password Set!</h1>
          <p className="text-slate-500 font-medium">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Set Your Password</h1>
          <p className="text-slate-400 text-sm font-medium">
            Choose a password to access Creative Ops
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
            <p className="text-rose-600 text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
              New Password
            </label>
            <input
              required
              type="password"
              className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
              Confirm Password
            </label>
            <input
              required
              type="password"
              className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 transition-all"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Setting Password..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}