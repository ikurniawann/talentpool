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
      {/* Left Panel - Pink/Black Background */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #db2777 0%, #be185d 50%, #000000 100%)',
        }}
      >
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2" style={{ color: '#ffffff' }}>
              <span className="text-4xl font-bold">Arkiv</span>
              <span className="text-2xl font-light" style={{ opacity: 0.8 }}>OS</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#ffffff' }}>
                Arkiv Operating System
              </h1>
              <p className="text-lg font-medium mb-6" style={{ color: '#fbcfe8' }}>
                HR System · Purchasing Control · Point of Sales
              </p>
              <p className="text-base leading-relaxed max-w-md" style={{ color: '#fce7f3' }}>
                Platform terintegrasi untuk mengelola sumber daya manusia, 
                kontrol pembelian, dan penjualan retail dalam satu sistem.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold" style={{ color: '#ffffff' }}>HR</div>
                <div className="text-sm mt-1" style={{ color: '#fbcfe8' }}>Human Resources</div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: '#ffffff' }}>POS</div>
                <div className="text-sm mt-1" style={{ color: '#fbcfe8' }}>Point of Sales</div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: '#ffffff' }}>Purchasing</div>
                <div className="text-sm mt-1" style={{ color: '#fbcfe8' }}>Purchasing Control</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <p className="text-sm" style={{ color: '#fbcfe8' }}>
              © 2026 Arkiv Operating System by WIT.ID. All rights reserved.
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
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
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
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
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
                className="w-full py-3 px-4 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? "Memproses..." : "Masuk ke Akun"}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 text-sm text-pink-600 bg-pink-50 rounded-lg border border-pink-100">
                {error}
              </div>
            )}

            {/* Terms */}
            <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
              Dengan masuk, Anda menyetujui{" "}
              <a href="#" className="text-pink-600 hover:underline">
                kebijakan privasi
              </a>{" "}
              dan{" "}
              <a href="#" className="text-pink-600 hover:underline">
                syarat ketentuan
              </a>
            </p>
          </div>

          {/* Powered by */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Powered by{" "}
              <a href="https://wit.id" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline font-medium">
                WIT.ID
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
