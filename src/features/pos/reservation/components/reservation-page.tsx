'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Calendar, Clock, Loader2, MessageSquare, Phone, Plus, Search, User, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type {
  CreateReservationPayload,
  OrderType,
  ReservationCustomer,
  ReservationRow,
  ReservationStatus,
} from '../types';
import { useReservationCustomers, useReservationList, useReservationTables } from '../queries';
import { useCreateReservation, useUpdateReservationStatus } from '../mutations';

const timeSlots = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getToday = () => new Date().toISOString().split('T')[0];

function getStatusBadge(status: ReservationStatus) {
  switch (status) {
    case 'pending': return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    case 'confirmed': return { label: 'Dikonfirmasi', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'seated': return { label: 'Ditempati', className: 'bg-green-100 text-green-700 border-green-200' };
    case 'completed': return { label: 'Selesai', className: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'cancelled': return { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 border-red-200' };
    case 'no_show': return { label: 'No Show', className: 'bg-red-100 text-red-700 border-red-200' };
  }
}

function reservationName(row: ReservationRow) {
  return row.customer?.name || row.customer_name || 'Tanpa Nama';
}

function reservationPhone(row: ReservationRow) {
  return row.customer?.phone || row.customer_phone || '-';
}

export function ReservationPage() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  const [error, setError] = useState('');
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppReservation, setWhatsAppReservation] = useState<ReservationRow | null>(null);
  const [whatsAppType, setWhatsAppType] = useState<'reminder' | 'confirmation'>('reminder');

  const {
    data: reservations = [],
    isLoading: loading,
    error: reservationsError,
    refetch: _refetchReservations,
  } = useReservationList({ date: selectedDate, status: filterStatus });
  const { data: customers = [], error: customersError } = useReservationCustomers();
  const { data: tables = [], refetch: refetchTables } = useReservationTables();
  const createReservationMutation = useCreateReservation();
  const updateStatusMutation = useUpdateReservationStatus();

  const queryError =
    (reservationsError instanceof Error ? reservationsError.message : '') ||
    (customersError instanceof Error ? customersError.message : '');
  const submitting = createReservationMutation.isPending;

  const [formData, setFormData] = useState({
    customerId: null as string | null,
    customerName: '',
    customerPhone: '',
    date: getToday(),
    time: '12:00',
    guestCount: 2,
    tableId: null as string | null,
    notes: '',
    deposit: 0,
    orderType: 'dine_in' as OrderType,
  });

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => `${customer.name || ''} ${customer.phone}`.toLowerCase().includes(query));
  }, [customerSearch, customers]);

  const sortedReservations = useMemo(() => (
    [...reservations].sort((a, b) => String(a.time_slot || '').localeCompare(String(b.time_slot || '')))
  ), [reservations]);

  function selectCustomer(customer: ReservationCustomer) {
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name || '',
      customerPhone: customer.phone,
    }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
  }

  function resetForm() {
    setFormData({
      customerId: null,
      customerName: '',
      customerPhone: '',
      date: selectedDate,
      time: '12:00',
      guestCount: 2,
      tableId: null,
      notes: '',
      deposit: 0,
      orderType: 'dine_in',
    });
  }

  async function submitReservation() {
    if (!formData.customerName || !formData.date || !formData.time) return;
    setError('');
    try {
      const payload: CreateReservationPayload = {
        table_id: formData.tableId,
        customer_id: formData.customerId,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        reservation_date: formData.date,
        time_slot: formData.time,
        pax_count: formData.guestCount,
        special_requests: formData.orderType,
        deposit_amount: formData.deposit,
        notes: formData.notes,
      };
      await createReservationMutation.mutateAsync(payload);
      setShowNewForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan reservasi');
    }
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    setError('');
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      await refetchTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update reservasi');
    }
  }

  function generateWhatsAppMessage(reservation: ReservationRow, type: 'reminder' | 'confirmation') {
    const dateObj = new Date(`${reservation.reservation_date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const intro = type === 'confirmation' ? 'Reservasi Anda telah dikonfirmasi:' : 'Ini adalah reminder untuk reservasi Anda:';
    return `Halo ${reservationName(reservation)}!\n\n${intro}\n\nTanggal: ${formattedDate}\nJam: ${reservation.time_slot}\nJumlah tamu: ${reservation.pax_count} orang\n${reservation.table?.table_number ? `Meja: ${reservation.table.table_number}\n` : ''}${reservation.notes ? `Catatan: ${reservation.notes}\n` : ''}\nMohon tiba 10 menit sebelum waktu reservasi.\n\nPrologue Wonderland`;
  }

  function openWhatsApp(reservation: ReservationRow, type: 'reminder' | 'confirmation') {
    setWhatsAppReservation(reservation);
    setWhatsAppType(type);
    setShowWhatsAppDialog(true);
  }

  function sendWhatsApp() {
    if (!whatsAppReservation) return;
    const phone = reservationPhone(whatsAppReservation).replace(/[^0-9]/g, '');
    const normalizedPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
    const message = generateWhatsAppMessage(whatsAppReservation, whatsAppType);
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setShowWhatsAppDialog(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-pink-600" />
          <h1 className="text-lg font-bold text-gray-900">Reservasi</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
        >
          <Plus className="h-4 w-4" />
          Reservasi Baru
        </button>
      </div>

      {(error || queryError) && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error || queryError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'pending', 'confirmed', 'seated', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterStatus === status ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Semua' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat reservasi...
          </div>
        ) : sortedReservations.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-400">
            <Calendar className="mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Tidak ada reservasi</p>
          </div>
        ) : (
          sortedReservations.map((reservation) => {
            const statusBadge = getStatusBadge(reservation.status);
            return (
              <div key={reservation.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{reservationName(reservation)}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {reservationPhone(reservation)}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {reservation.pax_count} org</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Clock className="h-4 w-4 text-gray-500" />
                      {reservation.time_slot}
                    </div>
                    {reservation.table?.table_number && <div className="mt-0.5 text-xs text-gray-500">{reservation.table.table_number}</div>}
                  </div>
                </div>

                {reservation.notes && <div className="mb-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{reservation.notes}</div>}
                {Number(reservation.deposit_amount || 0) > 0 && (
                  <div className="mb-3 text-xs font-medium text-green-600">Deposit: {formatCurrency(Number(reservation.deposit_amount))}</div>
                )}

                <div className="flex gap-2 border-t border-gray-100 pt-2">
                  {reservation.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(reservation.id, 'confirmed')} className="flex-1 rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">Konfirmasi</button>
                      <button onClick={() => openWhatsApp(reservation, 'confirmation')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-50 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"><MessageSquare className="h-3 w-3" /> WA</button>
                      <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"><X className="h-3 w-3" /></button>
                    </>
                  )}
                  {reservation.status === 'confirmed' && (
                    <>
                      <button onClick={() => updateStatus(reservation.id, 'seated')} className="flex-1 rounded-lg bg-green-50 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100">Tempati Meja</button>
                      <button onClick={() => openWhatsApp(reservation, 'reminder')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-50 py-1.5 text-xs font-medium text-green-600 hover:bg-green-100"><MessageSquare className="h-3 w-3" /> Reminder</button>
                      <button onClick={() => updateStatus(reservation.id, 'no_show')} className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">No Show</button>
                    </>
                  )}
                  {reservation.status === 'seated' && (
                    <button onClick={() => updateStatus(reservation.id, 'completed')} className="flex-1 rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">Selesaikan</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={showNewForm} onOpenChange={(open) => !open && setShowNewForm(false)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Reservasi Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Pelanggan</label>
              <button onClick={() => setShowCustomerSearch(true)} className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span className={formData.customerName ? 'text-gray-900' : 'text-gray-400'}>{formData.customerName || 'Cari pelanggan...'}</span>
                <Search className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal"><input type="date" value={formData.date} onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" /></Field>
              <Field label="Waktu"><select value={formData.time} onChange={(event) => setFormData((prev) => ({ ...prev, time: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">{timeSlots.map((slot) => <option key={slot}>{slot}</option>)}</select></Field>
            </div>

            <Field label="Jumlah Tamu">
              <input type="number" min={1} value={formData.guestCount} onChange={(event) => setFormData((prev) => ({ ...prev, guestCount: Math.max(1, Number(event.target.value) || 1) }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </Field>

            <Field label="Pilih Meja">
              <div className="grid grid-cols-4 gap-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setFormData((prev) => ({ ...prev, tableId: prev.tableId === table.id ? null : table.id }))}
                    className={`rounded-lg border-2 p-2 text-xs font-medium transition-all ${
                      formData.tableId === table.id ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    <div>{table.table_number || table.label || table.id.slice(0, 6)}</div>
                    <div className="opacity-70">{table.capacity || 4} org</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tipe Pesanan">
              <div className="flex gap-2">
                {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map((type) => (
                  <button key={type} onClick={() => setFormData((prev) => ({ ...prev, orderType: type }))} className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium ${formData.orderType === type ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-pink-400'}`}>
                    {type === 'dine_in' ? 'Dine-in' : type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Deposit">
              <div className="flex gap-2">
                {[0, 25000, 50000, 100000].map((amount) => (
                  <button key={amount} onClick={() => setFormData((prev) => ({ ...prev, deposit: amount }))} className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium ${formData.deposit === amount ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-pink-400'}`}>
                    {amount === 0 ? 'Tanpa' : formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Catatan">
              <textarea value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Contoh: Ultah anak, meeting kantor..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-16 resize-none" />
            </Field>
          </div>
          <div className="flex gap-3 border-t pt-3">
            <button onClick={() => setShowNewForm(false)} className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Batal</button>
            <button onClick={submitReservation} disabled={submitting || !formData.customerName || !formData.date || !formData.time} className="flex-1 rounded-lg bg-pink-600 py-2.5 text-sm font-medium text-white hover:bg-pink-700 disabled:bg-gray-300">
              {submitting ? 'Menyimpan...' : 'Simpan Reservasi'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomerSearch} onOpenChange={(open) => !open && setShowCustomerSearch(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm font-semibold">Cari Pelanggan</DialogTitle></DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Nama atau telepon..." autoFocus className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              <button onClick={() => { setFormData((prev) => ({ ...prev, customerId: null, customerName: '', customerPhone: '' })); setShowCustomerSearch(false); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"><User className="h-4 w-4 text-gray-500" /></div>
                <div><div className="text-sm font-medium text-gray-900">Pelanggan Baru</div><div className="text-xs text-gray-500">Input manual di catatan nanti</div></div>
              </button>
              {filteredCustomers.map((customer) => (
                <button key={customer.id} onClick={() => selectCustomer(customer)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-pink-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100"><span className="text-sm font-bold text-pink-600">{(customer.name || customer.phone).charAt(0)}</span></div>
                  <div className="flex-1"><div className="text-sm font-medium text-gray-900">{customer.name || 'Tanpa Nama'}</div><div className="text-xs text-gray-500">{customer.phone}</div></div>
                  <div className="text-xs text-gray-400">{customer.visit_count || 0}x</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhatsAppDialog} onOpenChange={(open) => !open && setShowWhatsAppDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-green-600" />Kirim WhatsApp</DialogTitle></DialogHeader>
          {whatsAppReservation && (
            <div className="space-y-4 py-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-gray-700 whitespace-pre-line">
                {generateWhatsAppMessage(whatsAppReservation, whatsAppType)}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowWhatsAppDialog(false)} className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Batal</button>
                <button onClick={sendWhatsApp} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700">
                  <MessageSquare className="h-4 w-4" />
                  Kirim via WhatsApp
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
