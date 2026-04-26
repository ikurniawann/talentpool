"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@aapextechnology.com";
const DEMO_HM_EMAIL = process.env.NEXT_PUBLIC_DEMO_HM_EMAIL ?? "demohm@aapextechnology.com";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo123456";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/dashboard/purchasing");
    }
  };

  const handleBypassLogin = () => {
    // Bypass auth for UI testing - set a demo flag in localStorage
    localStorage.setItem('pos_demo_mode', 'true');
    router.replace("/dashboard/pos");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-md">
        <div className="mb-8 text-center">
          <img src="/logos/logo.png" alt="Prologue in Wounderland" className="w-64 h-auto mx-auto mb-4 bg-transparent" />
          <p className="text-sm text-gray-500">Backoffice System</p>
        </div>

        {/* Demo Mode Bypass - Prominent */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
          <button
            type="button"
            onClick={handleBypassLogin}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            🚀 Coba POS Tanpa Login
          </button>
          <p className="text-[10px] text-green-700 text-center mt-2">
            Mode demo untuk testing UI - data tidak tersimpan
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@contoh.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
      </div>
    </div>
  );
}

