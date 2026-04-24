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
      router.replace("/dashboard");
    }
  };

  const handleDemoLogin = async (role: "hrd" | "hiring_manager") => {
    const demoEmail = role === "hrd" ? DEMO_EMAIL : DEMO_HM_EMAIL;
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);

    // Wait for React to re-render with new state, then submit
    await new Promise((r) => setTimeout(r, 50));
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleLogin(fakeEvent);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-md">
        <div className="mb-8 text-center">
          <img src="/logos/logo.png" alt="Prologue in Wounderland" className="w-48 h-auto mx-auto mb-4" />
          <p className="text-sm text-gray-500">Backoffice System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

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

        {/* Demo Login Bypass */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center mb-3">
            Login cepat untuk demo — tidak perlu password
          </p>



          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("hrd")}
              className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
            >
              Isi Login HRD
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("hiring_manager")}
              className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors"
            >
              Isi Login Manager
            </button>
          </div>

          <p className="text-[10px] text-gray-300 text-center mt-2">
            Default: demo@aapextechnology.com / demo123456
          </p>
        </div>
      </div>
    </div>
  );
}

