"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { CandidateSource } from "@/types";

export default function PortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; title: string }[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    domicile: "",
    source: "portal" as CandidateSource,
    position_id: "",
    brand_id: "",
    notes: "",
  });

  useEffect(() => {
    // Fetch active brands
    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setBrands(data);
      });
  }, []);

  useEffect(() => {
    // Fetch active positions for selected brand
    if (form.brand_id) {
      supabase
        .from("positions")
        .select("id, title")
        .eq("brand_id", form.brand_id)
        .eq("is_active", true)
        .then(({ data }) => {
          if (data) setPositions(data);
        });
    } else {
      setPositions([]);
    }
  }, [form.brand_id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("candidates").insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      domicile: form.domicile,
      source: form.source,
      position_id: form.position_id || null,
      brand_id: form.brand_id || null,
      notes: form.notes || null,
      status: "new",
    });

    setLoading(false);

    if (error) {
      alert("Terjadi kesalahan: " + error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Lamaran Terkirim!
          </h2>
          <p className="text-gray-600 mb-6">
            Terima kasih sudah melamar. Tim HRD kami akan menghubungi kamu
            untuk langkah selanjutnya.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Lamar Kerja di Aapex Technology
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Isi formulir di bawah untuk melamar posisi yang tersedia
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outlet / Brand
            </label>
            <select
              name="brand_id"
              value={form.brand_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Outlet</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posisi yang Dilamar
            </label>
            <select
              name="position_id"
              value={form.position_id}
              onChange={handleChange}
              disabled={!form.brand_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Pilih Posisi</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama lengkap kamu"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@contoh.com"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. WhatsApp
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="08xxxxxxxxxx"
              required
            />
          </div>

          {/* Domicile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domisili
            </label>
            <input
              type="text"
              name="domicile"
              value={form.domicile}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kota tempat tinggal"
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sumber Informasi Lowongan
            </label>
            <select
              name="source"
              value={form.source}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="portal">Website / Portal</option>
              <option value="instagram">Instagram</option>
              <option value="jobstreet">JobStreet</option>
              <option value="jobfair">Job Fair</option>
              <option value="referral">Rekomendasi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan (opsional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Info tambahan yang ingin kamu sampaikan"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim Lamaran"}
          </button>
        </form>
      </div>
    </div>
  );
}
