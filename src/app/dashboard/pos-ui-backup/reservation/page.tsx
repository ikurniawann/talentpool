'use client';

import { useState } from 'react';
import { 
  Calendar, Clock, Users, Phone, User, Search, Check, X, 
  ArrowLeft, MessageSquare, CreditCard, Bell, MapPin, ChevronRight, Plus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
type OrderType = 'dine_in' | 'takeaway' | 'delivery';

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guestCount: number;
  tableId: string | null;
  tableName: string | null;
  notes: string;
  status: ReservationStatus;
  deposit: number;
  orderType: OrderType;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  visitCount: number;
}

const mockReservations: Reservation[] = [
  { id: 'r1', customerName: 'Ahmad Wijaya', customerPhone: '081234567890', date: '2026-04-27', time: '12:00', guestCount: 4, tableId: 't1', tableName: 'Meja 1', notes: 'Ulang tahun anak', status: 'confirmed', deposit: 50000, orderType: 'dine_in' },
  { id: 'r2', customerName: 'Siti Rahayu', customerPhone: '081234567891', date: '2026-04-27', time: '13:00', guestCount: 2, tableId: 't3', tableName: 'Meja 3', notes: '', status: 'pending', deposit: 0, orderType: 'dine_in' },
  { id: 'r3', customerName: 'Budi Santoso', customerPhone: '081234567892', date: '2026-04-28', time: '19:00', guestCount: 8, tableId: null, tableName: null, notes: 'Meeting kantor', status: 'pending', deposit: 100000, orderType: 'dine_in' },
  { id: 'r4', customerName: 'Warung Kopi Nusantara', customerPhone: '081234567893', date: '2026-04-27', time: '18:00', guestCount: 6, tableId: 't5', tableName: 'Meja 5', notes: 'K耗团建', status: 'confirmed', deposit: 75000, orderType: 'dine_in' },
];

const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Ahmad Wijaya', phone: '081234567890', visitCount: 12 },
  { id: 'c2', name: 'Siti Rahayu', phone: '081234567891', visitCount: 5 },
  { id: 'c3', name: 'Budi Santoso', phone: '081234567892', visitCount: 8 },
  { id: 'c4', name: 'Warung Kopi Nusantara', phone: '081234567893', visitCount: 20 },
  { id: 'c5', name: 'H. Abdullah Trading', phone: '081234567894', visitCount: 15 },
];

const tables = [
  { id: 't1', name: 'Meja 1', capacity: 4, status: 'occupied' },
  { id: 't2', name: 'Meja 2', capacity: 4, status: 'available' },
  { id: 't3', name: 'Meja 3', capacity: 6, status: 'reserved' },
  { id: 't4', name: 'Meja 4', capacity: 2, status: 'available' },
  { id: 't5', name: 'Meja 5', capacity: 8, status: 'occupied' },
  { id: 't6', name: 'Meja 6', capacity: 10, status: 'available' },
  { id: 't7', name: 'Meja 7', capacity: 4, status: 'available' },
  { id: 't8', name: 'VIP Room 1', capacity: 12, status: 'available' },
];

const timeSlots = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const getStatusBadge = (status: ReservationStatus) => {
  switch (status) {
    case 'pending': return { label: 'Pending', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    case 'confirmed': return { label: 'Dikonfirmasi', class: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'seated': return { label: 'Ditempati', class: 'bg-green-100 text-green-700 border-green-200' };
    case 'completed': return { label: 'Selesai', class: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'cancelled': return { label: 'Dibatalkan', class: 'bg-red-100 text-red-700 border-red-200' };
    case 'no_show': return { label: 'No Show', class: 'bg-red-100 text-red-700 border-red-200' };
  }
};

const getToday = () => new Date().toISOString().split('T')[0];

export default function ReservationPage() {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  
  // New reservation form
  const [formData, setFormData] = useState({
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

  // WhatsApp state
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppReservation, setWhatsAppReservation] = useState<Reservation | null>(null);
  const [whatsAppType, setWhatsAppType] = useState<'reminder' | 'confirmation' | 'custom'>('reminder');

  const generateWhatsAppMessage = (reservation: Reservation, type: 'reminder' | 'confirmation') => {
    const dateObj = new Date(reservation.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    if (type === 'confirmation') {
      return `Halo ${reservation.customerName}! 👋

Reservasi Anda telah *dikonfirmasi*:

📅 *${formattedDate}*
🕐 *${reservation.time}*
👥 *${reservation.guestCount} orang*
${reservation.tableName ? `🪑 *${reservation.tableName}*` : ''}
${reservation.notes ? `📝 *${reservation.notes}*` : ''}

Kami tunggu kedatangannya! 🙏

*Prologue Wonderland*`;
    }

    return `Halo ${reservation.customerName}! 👋

Ini adalah *reminder* untuk reservasi Anda:

📅 *${formattedDate}*
🕐 *${reservation.time}*
👥 *${reservation.guestCount} orang*
${reservation.tableName ? `🪑 *${reservation.tableName}*` : ''}

Mohon tiba 10 menit sebelum waktu reservasi.

Jika ada perubahan, silakan hubungi kami.

*Prologue Wonderland*`;
  };

  const openWhatsApp = (reservation: Reservation, type: 'reminder' | 'confirmation') => {
    setWhatsAppReservation(reservation);
    setWhatsAppType(type);
    setShowWhatsAppDialog(true);
  };

  const sendWhatsApp = () => {
    if (!whatsAppReservation) return;
    const message = generateWhatsAppMessage(whatsAppReservation, whatsAppType);
    const phone = whatsAppReservation.customerPhone.replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/62${phone.slice(1)}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
    setShowWhatsAppDialog(false);
  };

  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

  const filteredReservations = reservations
    .filter(r => r.date === selectedDate)
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
    }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const handleTableSelect = (tableId: string) => {
    setFormData(prev => ({
      ...prev,
      tableId: prev.tableId === tableId ? null : tableId,
    }));
  };

  const submitReservation = () => {
    if (!formData.customerName || !formData.date || !formData.time) return;
    
    const table = tables.find(t => t.id === formData.tableId);
    const newReservation: Reservation = {
      id: `r${Date.now()}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      date: formData.date,
      time: formData.time,
      guestCount: formData.guestCount,
      tableId: formData.tableId,
      tableName: table?.name || null,
      notes: formData.notes,
      status: formData.deposit > 0 ? 'confirmed' : 'pending',
      deposit: formData.deposit,
      orderType: formData.orderType,
    };
    
    setReservations(prev => [...prev, newReservation]);
    setShowNewForm(false);
    setFormData({
      customerName: '',
      customerPhone: '',
      date: getToday(),
      time: '12:00',
      guestCount: 2,
      tableId: null,
      notes: '',
      deposit: 0,
      orderType: 'dine_in',
    });
  };

  const updateStatus = (id: string, newStatus: ReservationStatus) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-600" />
            <h1 className="text-lg font-bold text-gray-900">Reservasi</h1>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Reservasi Baru
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'confirmed', 'seated', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === status 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'pending' ? 'Pending' : status === 'confirmed' ? 'Confirmed' : status === 'seated' ? 'Seated' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Calendar className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Tidak ada reservasi</p>
          </div>
        ) : (
          filteredReservations.map(reservation => {
            const statusBadge = getStatusBadge(reservation.status);
            return (
              <div key={reservation.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{reservation.customerName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {reservation.customerPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {reservation.guestCount} org
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Clock className="w-4 h-4 text-gray-500" />
                      {reservation.time}
                    </div>
                    {reservation.tableName && (
                      <div className="text-xs text-gray-500 mt-0.5">{reservation.tableName}</div>
                    )}
                  </div>
                </div>

                {reservation.notes && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">
                    {reservation.notes}
                  </div>
                )}

                {reservation.deposit > 0 && (
                  <div className="text-xs text-green-600 font-medium mb-3">
                    Deposit: {formatCurrency(reservation.deposit)}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {reservation.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateStatus(reservation.id, 'confirmed')}
                        className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100"
                      >
                        Konfirmasi
                      </button>
                      <button 
                        onClick={() => openWhatsApp(reservation, 'confirmation')}
                        className="flex-1 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-lg hover:bg-green-100 flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WA Konfirmasi
                      </button>
                      <button 
                        onClick={() => updateStatus(reservation.id, 'cancelled')}
                        className="py-1.5 px-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {reservation.status === 'confirmed' && (
                    <>
                      <button 
                        onClick={() => updateStatus(reservation.id, 'seated')}
                        className="flex-1 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-lg hover:bg-green-100"
                      >
                        Tempati Meja
                      </button>
                      <button 
                        onClick={() => openWhatsApp(reservation, 'reminder')}
                        className="flex-1 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-lg hover:bg-green-100 flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WA Reminder
                      </button>
                      <button 
                        onClick={() => updateStatus(reservation.id, 'no_show')}
                        className="py-1.5 px-2 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100"
                      >
                        No Show
                      </button>
                    </>
                  )}
                  {reservation.status === 'seated' && (
                    <button 
                      onClick={() => updateStatus(reservation.id, 'completed')}
                      className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
                    >
                      Selesaikan
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Reservation Modal */}
      <Dialog open={showNewForm} onOpenChange={(o) => !o && setShowNewForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Reservasi Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Customer Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Pelanggan</label>
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className={formData.customerName ? 'text-gray-900' : 'text-gray-400'}>
                  {formData.customerName || 'Cari pelanggan...'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Waktu</label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Guest Count */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Jumlah Tamu</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, guestCount: Math.max(1, prev.guestCount - 1) }))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Users className="w-4 h-4" />
                </button>
                <span className="text-lg font-semibold text-gray-900 w-12 text-center">{formData.guestCount}</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, guestCount: prev.guestCount + 1 }))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Pilih Meja (opsional)</label>
              <div className="grid grid-cols-4 gap-2">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => handleTableSelect(table.id)}
                    disabled={table.status === 'occupied'}
                    className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      formData.tableId === table.id
                        ? 'border-pink-600 bg-pink-50 text-pink-700'
                        : table.status === 'occupied'
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-pink-400 text-gray-700'
                    }`}
                  >
                    <div>{table.name}</div>
                    <div className="text-xs opacity-70">{table.capacity} org</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tipe Pesanan</label>
              <div className="flex gap-2">
                {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData(prev => ({ ...prev, orderType: type }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      formData.orderType === type
                        ? 'border-pink-600 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    {type === 'dine_in' ? 'Dine-in' : type === 'takeaway' ? 'Takeaway' : 'Delivery'}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Deposit (opsional)</label>
              <div className="flex gap-2">
                {[0, 25000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setFormData(prev => ({ ...prev, deposit: amount }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      formData.deposit === amount
                        ? 'border-pink-600 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-700 hover:border-pink-400'
                    }`}
                  >
                    {amount === 0 ? 'Tanpa' : formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Contoh: Ultah anak, meeting kantor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={() => setShowNewForm(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              onClick={submitReservation}
              disabled={!formData.customerName || !formData.date || !formData.time}
              className="flex-1 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Simpan Reservasi
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Search Modal */}
      <Dialog open={showCustomerSearch} onOpenChange={(o) => !o && setShowCustomerSearch(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Cari Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Nama atau telepon..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, customerName: '', customerPhone: '' }));
                  setShowCustomerSearch(false);
                }}
                className="w-full p-3 text-left rounded-lg hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Pelanggan Baru</div>
                  <div className="text-xs text-gray-500">Tidak terdaftar</div>
                </div>
              </button>
              {filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className="w-full p-3 text-left rounded-lg hover:bg-pink-50 flex items-center gap-3"
                >
                  <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">{customer.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.phone}</div>
                  </div>
                  <div className="text-xs text-gray-400">{customer.visitCount}x</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Reminder Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={(o) => !o && setShowWhatsAppDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-600" />
              Kirim WhatsApp
            </DialogTitle>
          </DialogHeader>
          
          {whatsAppReservation && (
            <div className="py-3 space-y-4">
              {/* Recipient Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">{whatsAppReservation.customerName.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{whatsAppReservation.customerName}</div>
                  <div className="text-xs text-gray-500">{whatsAppReservation.customerPhone}</div>
                </div>
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Jenis Pesan</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWhatsAppType('reminder')}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                      whatsAppType === 'reminder'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-400'
                    }`}
                  >
                    Reminder
                  </button>
                  <button
                    onClick={() => setWhatsAppType('confirmation')}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                      whatsAppType === 'confirmation'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-400'
                    }`}
                  >
                    Konfirmasi
                  </button>
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Preview Pesan</label>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-gray-700 whitespace-pre-line max-h-48 overflow-y-auto">
                  {generateWhatsAppMessage(whatsAppReservation, whatsAppType)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWhatsAppDialog(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
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
