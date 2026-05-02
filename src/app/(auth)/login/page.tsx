"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      const purchasingRoles = [
        "purchasing_manager",
        "purchasing_staff",
        "purchasing_admin",
        "warehouse_staff",
        "qc_staff",
        "finance_staff",
      ];

      if (profile?.role === "pos") {
        router.replace("/dashboard/pos/cashier-new");
      } else if (profile && purchasingRoles.includes(profile.role)) {
        router.replace("/dashboard/purchasing");
      } else {
        router.replace("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Red Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-700 to-red-900 relative overflow-hidden">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="text-4xl font-bold">Talent</span>
              <span className="text-2xl font-light opacity-80">Pool</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Visitor Management System
              </h1>
              <p className="text-red-100 text-lg leading-relaxed max-w-md">
                Kelola kunjungan dan networking dengan mudah — dari tracking visitor, 
                manajemen member, hingga laporan meeting real-time.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-white">90+</div>
                <div className="text-red-200 text-sm mt-1">Active Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Weekly</div>
                <div className="text-red-200 text-sm mt-1">Meetings</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Real-time</div>
                <div className="text-red-200 text-sm mt-1">Tracking</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <p className="text-red-200 text-sm">
              © 2026 TalentPool. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Selamat Datang</h2>
            <p className="text-gray-500 mt-2">Silakan login untuk melanjutkan</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Login Portal</h3>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    placeholder="Masukkan email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? "Memproses..." : "Masuk ke Akun"}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Terms */}
            <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
              Dengan masuk, Anda menyetujui{" "}
              <a href="#" className="text-red-600 hover:underline">
                kebijakan privasi
              </a>{" "}
              dan{" "}
              <a href="#" className="text-red-600 hover:underline">
                syarat ketentuan
              </a>
            </p>
          </div>

          {/* Powered by */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Powered by{" "}
              <a href="https://wit.id" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline font-medium">
                WIT.ID
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
