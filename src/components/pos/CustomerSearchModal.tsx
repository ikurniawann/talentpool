'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, User } from 'lucide-react';
import type { CustomerWithDiscount } from '@/hooks/use-pos-customers';

interface Props {
  open: boolean;
  customers: CustomerWithDiscount[];
  search: string;
  selectedCustomerId: string | null;
  onSearchChange: (v: string) => void;
  onSelect: (customer: CustomerWithDiscount | null) => void;
  onCreateCustomer?: (payload: {
    name: string;
    phone: string;
    email?: string;
    enroll_member: boolean;
  }) => Promise<CustomerWithDiscount>;
  onClose: () => void;
}

export function CustomerSearchModal({
  open,
  customers,
  search,
  selectedCustomerId,
  onSearchChange,
  onSelect,
  onCreateCustomer,
  onClose,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [enrollMember, setEnrollMember] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  const resetCreateForm = () => {
    setShowCreate(false);
    setName('');
    setPhone('');
    setEmail('');
    setEnrollMember(true);
    setFormError('');
    setSaving(false);
  };

  const openCreateForm = () => {
    const raw = search.trim();
    setShowCreate(true);
    setFormError('');
    if (/^[+\d\s-]+$/.test(raw)) setPhone(raw);
    else setName(raw);
  };

  const handleCreate = async () => {
    if (!onCreateCustomer) return;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setFormError('Nama wajib diisi');
      return;
    }

    if (!cleanPhone) {
      setFormError('Nomor HP wajib diisi');
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      const customer = await onCreateCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined,
        enroll_member: enrollMember,
      });
      resetCreateForm();
      onSearchChange('');
      onSelect(customer);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan pelanggan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetCreateForm(); onClose(); } }}>
      <DialogContent className="w-[calc(100vw-32px)] max-w-4xl sm:!max-w-4xl max-h-[84vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{showCreate ? 'Tambah Pelanggan / Member' : 'Pilih Pelanggan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!showCreate ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari nama / nomor HP..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => onSelect(null)}
                  className="px-4 py-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Guest / Tanpa Pelanggan</div>
                    <div className="text-sm text-gray-500">Tidak mendapat diskon dan XP</div>
                  </div>
                </button>
                <button
                  onClick={openCreateForm}
                  className="px-4 py-3 text-left rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-violet-800">Tambah Pelanggan / Member</div>
                    <div className="text-sm text-violet-600">Daftar langsung ke CRM</div>
                  </div>
                </button>
              </div>
              {filtered.length === 0 && search.trim() && (
                <button
                  onClick={openCreateForm}
                  className="w-full rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-left text-sm font-semibold text-pink-700 hover:bg-pink-100"
                >
                  Tidak ditemukan. Tambah {search.trim()} sebagai pelanggan baru
                </button>
              )}
              <div className="space-y-2">
                {filtered.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className={`w-full px-4 py-3 text-left rounded-lg border flex items-center gap-3 transition-colors ${
                      selectedCustomerId === customer.id
                        ? 'border-pink-600 bg-pink-50'
                        : 'border-gray-200 hover:bg-pink-50 hover:border-pink-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                      {customer.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          customer.membership_tier === 'platinum'
                            ? 'bg-purple-100 text-purple-700'
                            : customer.membership_tier === 'gold'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {customer.membership_tier}
                      </span>
                      {customer.discount > 0 && (
                        <div className="text-xs text-green-600 font-medium mt-1">-{customer.discount}%</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {formError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nama</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    placeholder="Nama pelanggan"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nomor HP</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Email optional</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-pink-100 bg-pink-50 p-3">
                <input
                  type="checkbox"
                  checked={enrollMember}
                  onChange={(e) => setEnrollMember(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-pink-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-pink-800">Daftarkan sebagai member</span>
                  <span className="block text-xs text-pink-600">Customer langsung masuk CRM membership dan bisa mengumpulkan XP.</span>
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan & Pilih'}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
