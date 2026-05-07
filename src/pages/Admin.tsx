import React from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, orderBy, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Reservation, SpecialPrice, HouseSettings, GlobalSettings } from '../types';
import { HOUSES } from '../constants';
import { Loader2, LogOut, Check, X, Shield, Calendar, Mail, Phone, Trash2, Tag, Plus, Home as HomeIcon, CheckCircle2 } from 'lucide-react';
import { format, isWithinInterval, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Edit2, Save } from 'lucide-react';
import { parseDateLocal } from '../lib/dateUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [reservations, setReservations] = React.useState<Reservation[]>([]);
  const [specialPrices, setSpecialPrices] = React.useState<SpecialPrice[]>([]);
  const [houseSettings, setHouseSettings] = React.useState<Record<string, number>>({});
  const [globalSettings, setGlobalSettings] = React.useState<GlobalSettings>({
    id: 'default',
    depositType: 'percent',
    depositValue: 30,
    daysToPayDeposit: 3
  });
  const [localGS, setLocalGS] = React.useState<GlobalSettings | null>(null);
  const [activeTab, setActiveTab] = React.useState<'reservations' | 'pricing'>('reservations');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  // Form states for new special price
  const [newSpecialPrice, setNewSpecialPrice] = React.useState({
    houseId: 'all',
    startDate: '',
    endDate: '',
    price: 0,
    label: ''
  });

  const [editingPrice, setEditingPrice] = React.useState<{ id: string, value: number } | null>(null);
  const [editingSpecialPriceId, setEditingSpecialPriceId] = React.useState<string | null>(null);
  const [editingSpecialPrice, setEditingSpecialPrice] = React.useState<any>(null);

  const getPriceForHouse = (houseId: string) => {
    if (houseId === 'all') return Object.values(houseSettings)[0] || HOUSES[0].priceBase || 0;
    return houseSettings[houseId] || HOUSES.find(h => h.id === houseId)?.priceBase || 0;
  };

  // Sync initial price once settings are loaded
  React.useEffect(() => {
    if (Object.keys(houseSettings).length > 0 && newSpecialPrice.price === 0) {
      setNewSpecialPrice(prev => ({ ...prev, price: getPriceForHouse(prev.houseId) }));
    }
  }, [houseSettings]);

  React.useEffect(() => {
    const adminSession = localStorage.getItem('admin_auth');
    if (adminSession === 'true') {
      setIsAuthenticated(true);
      fetchAllData();
    }
    setLoading(false);
  }, []);

  const fetchAllData = async () => {
    fetchReservations();
    fetchPricingData();
  };

  const calculateResPrice = (res: Reservation) => {
    if (res.totalPrice && res.totalPrice > 0) return res.totalPrice;

    // Fallback calculation logic
    let total = 0;
    const start = parseDateLocal(res.startDate);
    const end = parseDateLocal(res.endDate);

    let current = start;
    while (current < end) {
      const applicableSpecials = specialPrices.filter(sp =>
        (sp.houseId === res.houseId || sp.houseId === 'all') &&
        isWithinInterval(current, {
          start: parseDateLocal(sp.startDate),
          end: parseDateLocal(sp.endDate)
        })
      );

      if (applicableSpecials.length > 0) {
        // Use the lowest special price if multiple ranges overlap
        const minSpecial = Math.min(...applicableSpecials.map(s => s.price));
        total += minSpecial;
      } else {
        total += getPriceForHouse(res.houseId);
      }
      current = addDays(current, 1);
    }
    return total;
  };

  const fetchPricingData = async () => {
    const spPath = 'special_prices';
    const hsPath = 'house_settings';
    const gsPath = 'global_settings';
    try {
      // Fetch special prices
      try {
        const spSnapshot = await getDocs(collection(db, spPath));
        const sp: SpecialPrice[] = [];
        spSnapshot.forEach((doc) => {
          sp.push({ id: doc.id, ...doc.data() } as SpecialPrice);
        });
        setSpecialPrices(sp);
      } catch (error) {
        console.error('Błąd pobierania ofert specjalnych:', error);
        handleFirestoreError(error, OperationType.LIST, spPath);
      }

      // Fetch house settings
      try {
        const hsSnapshot = await getDocs(collection(db, hsPath));
        const hs: Record<string, number> = {};
        hsSnapshot.forEach((doc) => {
          const data = doc.data();
          hs[doc.id] = data.basePrice;
        });
        setHouseSettings(hs);
      } catch (error) {
        console.error('Błąd pobierania cen domków:', error);
        handleFirestoreError(error, OperationType.LIST, hsPath);
      }

      // Fetch global settings
      try {
        const gsDoc = await getDocs(collection(db, gsPath));
        if (!gsDoc.empty) {
          const gsData = gsDoc.docs[0].data() as GlobalSettings;
          const settings = { ...gsData, id: gsDoc.docs[0].id };
          setGlobalSettings(settings);
          setLocalGS(settings);
        } else {
          // Initialize if not exists
          const defaultGS = {
            depositType: 'percent',
            depositValue: 30,
            daysToPayDeposit: 3
          };
          const docRef = await addDoc(collection(db, gsPath), defaultGS);
          const settings = { id: docRef.id, ...defaultGS } as GlobalSettings;
          setGlobalSettings(settings);
          setLocalGS(settings);
        }
      } catch (error) {
        console.error('Błąd pobierania ustawień globalnych:', error);
        handleFirestoreError(error, OperationType.LIST, gsPath);
      }
    } catch (error) {
      console.error('Błąd ogólny pobierania ustawień:', error);
    }
  };

  const fetchReservations = async () => {
    const path = 'reservations';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const res: Reservation[] = [];
      querySnapshot.forEach((doc) => {
        res.push({ id: doc.id, ...doc.data() } as Reservation);
      });
      setReservations(res);
    } catch (error: any) {
      console.error('Błąd pobierania:', error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      fetchAllData();
    } else {
      alert('Niepoprawne hasło');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
  };

  const handleUpdateGlobalSettings = async (updates: Partial<GlobalSettings>) => {
    const path = `global_settings/${globalSettings.id}`;
    setIsProcessing('global-settings');
    try {
      await updateDoc(doc(db, 'global_settings', globalSettings.id), updates);
      setGlobalSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleDeposit = async (resId: string, isPaid: boolean) => {
    const path = `reservations/${resId}`;
    setIsProcessing(resId);
    try {
      const status = isPaid ? 'deposit_paid' : 'confirmed';
      await updateDoc(doc(db, 'reservations', resId), {
        isDepositPaid: isPaid,
        status
      });
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, isDepositPaid: isPaid, status } : r));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleMarkFullyPaid = async (resId: string) => {
    const path = `reservations/${resId}`;
    setIsProcessing(resId);
    try {
      await updateDoc(doc(db, 'reservations', resId), {
        isFullyPaid: true,
        isDepositPaid: true,
        status: 'confirmed'
      });
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, isFullyPaid: true, isDepositPaid: true, status: 'confirmed' } : r));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleStatusChange = async (resId: string, status: Reservation['status']) => {
    const path = `reservations/${resId}`;
    setIsProcessing(resId);
    try {
      await updateDoc(doc(db, 'reservations', resId), { status });
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, status } : r));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  React.useEffect(() => {
    if (reservations.length > 0 && globalSettings.daysToPayDeposit > 0) {
      const checkExpiry = async () => {
        const now = new Date();
        let changed = false;

        for (const res of reservations) {
          if (res.status !== 'cancelled' && !res.isDepositPaid && res.createdAt) {
            const createdDate = res.createdAt.toDate ? res.createdAt.toDate() : new Date(res.createdAt);
            const expiryDate = addDays(createdDate, globalSettings.daysToPayDeposit);

            if (now > expiryDate) {
              await handleStatusChange(res.id, 'cancelled');
              changed = true;
            }
          }
        }
        if (changed) fetchReservations();
      };
      // Only check once or on interval if needed, but here simple trigger is enough
      checkExpiry();
    }
  }, [reservations.length, globalSettings.daysToPayDeposit]);

  const handleUpdatePrice = async (resId: string, newPrice: number) => {
    const path = `reservations/${resId}`;
    setIsProcessing(`price-${resId}`);
    try {
      await updateDoc(doc(db, 'reservations', resId), { totalPrice: newPrice });
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, totalPrice: newPrice } : r));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (resId: string) => {
    setIsProcessing(resId);
    try {
      await deleteDoc(doc(db, 'reservations', resId));
      setReservations(prev => prev.filter(r => r.id !== resId));
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateBasePrice = async (houseId: string, price: number) => {
    const path = `house_settings/${houseId}`;
    setIsProcessing(`base-${houseId}`);
    try {
      await setDoc(doc(db, 'house_settings', houseId), { basePrice: price });
      setHouseSettings(prev => ({ ...prev, [houseId]: price }));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddSpecialPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'special_prices';
    setIsProcessing('new-special');
    try {
      const docRef = await addDoc(collection(db, path), {
        ...newSpecialPrice,
        createdAt: serverTimestamp()
      });
      setSpecialPrices(prev => [...prev, { id: docRef.id, ...newSpecialPrice } as SpecialPrice]);
      setNewSpecialPrice({
        houseId: 'all',
        startDate: '',
        endDate: '',
        price: getPriceForHouse('all'),
        label: ''
      });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateSpecialPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpecialPrice) return;
    setIsProcessing('save-special');
    try {
      await updateDoc(doc(db, 'special_prices', editingSpecialPrice.id), {
        houseId: editingSpecialPrice.houseId,
        startDate: editingSpecialPrice.startDate,
        endDate: editingSpecialPrice.endDate,
        price: editingSpecialPrice.price,
        label: editingSpecialPrice.label
      });
      setSpecialPrices(prev => prev.map(p => p.id === editingSpecialPrice.id ? { ...p, ...editingSpecialPrice } as SpecialPrice : p));
      setEditingSpecialPrice(null);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'special_prices');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteSpecialPrice = async (id: string) => {
    const path = `special_prices/${id}`;
    setIsProcessing(id);
    try {
      await deleteDoc(doc(db, 'special_prices', id));
      setSpecialPrices(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-accent text-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Shield size={40} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Panel Admina</h2>
          <p className="text-gray-500 mb-10">Wprowadź hasło, aby uzyskać dostęp.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono"
            />
            <button
              type="submit"
              className="w-full bg-accent text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
            >
              Zaloguj się
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold">Panel Kontrolny</h1>
            <p className="text-gray-500 font-medium">Zarządzanie domkami nad Zalewem Chańcza</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              A
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">Administrator</p>
              <p className="text-xs text-gray-400">Dostęp zabezpieczony</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'reservations' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            <Calendar size={18} />
            Rezerwacje
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'pricing' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            <Tag size={18} />
            Cennik
          </button>
        </div>

        {activeTab === 'reservations' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Wszystkie rezerwacje', value: reservations.length, icon: <Calendar fill="currentColor" opacity="0.2" /> },
                { label: 'Oczekujące', value: reservations.filter(r => !r.isDepositPaid && !r.isFullyPaid && r.status !== 'cancelled').length, icon: <Check />, color: 'text-amber-600' },
                { label: 'Wpłacona zaliczka', value: reservations.filter(r => r.isDepositPaid && !r.isFullyPaid && r.status !== 'cancelled').length, icon: <Tag />, color: 'text-blue-600' },
                { label: 'Opłacone/Zakoń.', value: reservations.filter(r => r.isFullyPaid && r.status !== 'cancelled').length, icon: <CheckCircle2 />, color: 'text-emerald-600' },
                { label: 'Anulowane', value: reservations.filter(r => r.status === 'cancelled').length, icon: <X />, color: 'text-rose-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 bg-primary-50 ${stat.color || 'text-primary-600'} rounded-lg flex items-center justify-center`}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className={`text-3xl font-display font-bold mb-1 ${stat.color || ''}`}>{stat.value}</p>
                  <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-lg">Ostatnie zgłoszenia</h3>
                <button
                  onClick={fetchReservations}
                  className="text-primary-600 text-sm font-bold hover:underline"
                >
                  Odśwież listę
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="px-6 py-5">Domek</th>
                      <th className="px-6 py-5">Klient</th>
                      <th className="px-6 py-5">Termin</th>
                      <th className="px-6 py-5">Cena</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="font-bold text-gray-900">{HOUSES.find(h => h.id === res.houseId)?.name || res.houseId}</p>
                          <p className="text-xs text-gray-400">ID: {res.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold">{res.customerName}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Mail size={12} /> {res.customerEmail}</span>
                            {res.customerPhone && <span className="flex items-center gap-1"><Phone size={12} /> {res.customerPhone}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{format(new Date(res.startDate), 'dd MMM', { locale: pl })}</span>
                            <span className="text-gray-300">→</span>
                            <span className="font-medium">{format(new Date(res.endDate), 'dd MMM', { locale: pl })}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Złożono: {res.createdAt ? format((res.createdAt as any).toDate(), 'dd.MM HH:mm') : '...'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 group/price min-w-[120px]">
                              {editingPrice?.id === res.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editingPrice.value}
                                    onChange={(e) => setEditingPrice({ ...editingPrice, value: Number(e.target.value) })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdatePrice(res.id, editingPrice.value);
                                        setEditingPrice(null);
                                      }
                                      if (e.key === 'Escape') setEditingPrice(null);
                                    }}
                                    className="w-20 bg-white border border-gray-200 rounded px-1 font-bold text-accent outline-none focus:ring-1 focus:ring-accent"
                                  />
                                  <button
                                    onClick={() => {
                                      handleUpdatePrice(res.id, editingPrice.value);
                                      setEditingPrice(null);
                                    }}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Save size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-accent">
                                    {(res.totalPrice || calculateResPrice(res)).toLocaleString()} zł
                                  </p>
                                  <button
                                    onClick={() => setEditingPrice({ id: res.id, value: res.totalPrice || calculateResPrice(res) })}
                                    className="text-gray-300 hover:text-accent opacity-0 group-hover/price:opacity-100 transition-opacity"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                </div>
                              )}
                              {isProcessing === `price-${res.id}` && <Loader2 size={12} className="animate-spin text-accent" />}
                            </div>
                            {res.depositAmount > 0 && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[8px] font-black uppercase tracking-tighter border border-blue-100/50">
                                <Tag size={8} />
                                Zaliczka: {res.depositAmount} zł
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border-2 ${res.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              res.isFullyPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                res.isDepositPaid ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {res.status === 'cancelled' ? 'Anulowane' :
                              res.isFullyPaid ? 'Wpłacono całość' :
                                res.isDepositPaid ? 'Wpłacono zaliczkę' :
                                  'Oczekujące'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {res.status !== 'cancelled' && (
                              <>
                                <button
                                  disabled={isProcessing === res.id}
                                  onClick={() => handleToggleDeposit(res.id, !res.isDepositPaid)}
                                  className={`p-2 rounded-lg transition-all ${res.isDepositPaid ? 'bg-accent text-white' : 'bg-accent/5 text-accent hover:bg-accent/10'}`}
                                  title={res.isDepositPaid ? "Cofnij zaliczkę" : "Potwierdź zaliczkę"}
                                >
                                  <Tag size={18} />
                                </button>
                                <button
                                  disabled={isProcessing === res.id}
                                  onClick={() => handleMarkFullyPaid(res.id)}
                                  className={`p-2 rounded-lg transition-all ${res.isFullyPaid ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                  title="Potwierdź pełną wpłatę"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  disabled={isProcessing === res.id}
                                  onClick={() => handleStatusChange(res.id, 'cancelled')}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-bold"
                                  title="Anuluj"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}
                            {res.status === 'cancelled' && (
                              <button
                                disabled={isProcessing === res.id}
                                onClick={() => handleDelete(res.id)}
                                className="p-2 text-red-100 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Usuń trwale"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reservations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                          Brak rezerwacji do wyświetlenia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-12">
            {/* Global Settings Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent text-white rounded-lg">
                  <Shield size={20} />
                </div>
                <h3 className="text-2xl font-display font-bold">Zarządzanie Zaliczkami i Systemem</h3>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                {localGS && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-500">Typ zaliczki</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                          <button
                            onClick={() => setLocalGS({ ...localGS, depositType: 'percent' })}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${localGS.depositType === 'percent' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                          >
                            Procent (%)
                          </button>
                          <button
                            onClick={() => setLocalGS({ ...localGS, depositType: 'fixed' })}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${localGS.depositType === 'fixed' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                          >
                            Stała (PLN)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-500">Wartość zaliczki</label>
                        <div className="relative">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                            {localGS.depositType === 'percent' ? '%' : 'PLN'}
                          </span>
                          <input
                            type="number"
                            value={localGS.depositValue}
                            onChange={(e) => setLocalGS({ ...localGS, depositValue: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-500">Dni na wpłatę (anulowanie)</label>
                        <div className="relative">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold uppercase text-[10px]">Dni</span>
                          <input
                            type="number"
                            value={localGS.daysToPayDeposit}
                            onChange={(e) => setLocalGS({ ...localGS, daysToPayDeposit: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        {isProcessing === 'global-settings' && (
                          <div className="flex items-center gap-2 text-accent text-sm font-bold">
                            <Loader2 size={16} className="animate-spin" />
                            Zapisywanie...
                          </div>
                        )}
                        {!isProcessing && JSON.stringify(localGS) !== JSON.stringify(globalSettings) && (
                          <div className="text-red-500 text-xs font-bold uppercase tracking-wider">
                            Niezapisane zmiany
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleUpdateGlobalSettings(localGS)}
                        disabled={isProcessing === 'global-settings' || JSON.stringify(localGS) === JSON.stringify(globalSettings)}
                        className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                      >
                        Zapisz ustawienia
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Base Prices Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent text-white rounded-lg">
                  <HomeIcon size={20} />
                </div>
                <h3 className="text-2xl font-display font-bold">Ceny podstawowe</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {HOUSES.map((house) => (
                  <div key={house.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="font-bold mb-4">{house.name}</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">PLN</span>
                        <input
                          type="number"
                          value={houseSettings[house.id] || house.priceBase}
                          onChange={(e) => setHouseSettings(prev => ({ ...prev, [house.id]: Number(e.target.value) }))}
                          className="w-full pl-11 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                      </div>
                      <button
                        disabled={isProcessing === `base-${house.id}`}
                        onClick={() => handleUpdateBasePrice(house.id, houseSettings[house.id] || house.priceBase)}
                        className="bg-accent text-white px-4 py-2 rounded-lg font-bold hover:scale-105 transition-all text-sm disabled:opacity-50"
                      >
                        {isProcessing === `base-${house.id}` ? <Loader2 className="animate-spin" size={16} /> : 'Zapisz'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Special Prices Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent text-white rounded-lg">
                    <Tag size={20} />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Ceny specjalne</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Form */}
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddSpecialPrice} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 space-y-6">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Plus size={20} /> Dodaj nową cenę
                    </h4>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Domek</label>
                      <select
                        value={newSpecialPrice.houseId}
                        onChange={(e) => {
                          const houseId = e.target.value;
                          setNewSpecialPrice(prev => ({
                            ...prev,
                            houseId,
                            price: getPriceForHouse(houseId)
                          }));
                        }}
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="all">Wszystkie</option>
                        {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500">Od</label>
                        <input
                          type="date"
                          value={newSpecialPrice.startDate}
                          onChange={(e) => setNewSpecialPrice(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500">Do</label>
                        <input
                          type="date"
                          value={newSpecialPrice.endDate}
                          onChange={(e) => setNewSpecialPrice(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Cena za dobę</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">PLN</span>
                        <input
                          type="number"
                          value={newSpecialPrice.price}
                          onChange={(e) => setNewSpecialPrice(prev => ({ ...prev, price: Number(e.target.value) }))}
                          placeholder="np. 800"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Etykieta (opcjonalnie)</label>
                      <input
                        type="text"
                        value={newSpecialPrice.label}
                        onChange={(e) => setNewSpecialPrice(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="np. Majówka"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing === 'new-special'}
                      className="w-full bg-accent text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {isProcessing === 'new-special' ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Dodaj okres</>}
                    </button>
                  </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          <th className="px-6 py-5">Domek</th>
                          <th className="px-6 py-5">Etykieta</th>
                          <th className="px-6 py-5">Okres</th>
                          <th className="px-6 py-5">Cena</th>
                          <th className="px-6 py-5 text-right">Akcje</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {specialPrices.map((sp) => (
                          <tr key={sp.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-5 font-bold">
                              {sp.houseId === 'all' ? 'Wszystkie' : HOUSES.find(h => h.id === sp.houseId)?.name}
                            </td>
                            <td className="px-6 py-5">
                              {sp.label ? (
                                <span className="bg-primary-50 text-primary-600 px-2 py-1 rounded-md text-xs font-bold">
                                  {sp.label}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-5 text-sm">
                              {format(new Date(sp.startDate), 'dd.MM.yyyy')} - {format(new Date(sp.endDate), 'dd.MM.yyyy')}
                            </td>
                            <td className="px-6 py-5 font-bold text-accent">
                              {sp.price} zł <span className="text-[10px] text-gray-400 font-normal uppercase ml-1">/ doba</span>
                            </td>
                            <td className="px-6 py-5 text-right whitespace-nowrap">
                              <button
                                onClick={() => setEditingSpecialPrice(sp)}
                                className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all mr-1"
                                title="Edytuj ofertę specjalną"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteSpecialPrice(sp.id)}
                                disabled={isProcessing === sp.id}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                title="Usuń ofertę specjalną"
                              >
                                {isProcessing === sp.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {specialPrices.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium">
                              Brak cen specjalnych.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
      {/* Edit Special Price Modal */}
      {editingSpecialPrice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Edit2 size={20} /> Edytuj cenę specjalną
              </h4>
              <button 
                onClick={() => setEditingSpecialPrice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateSpecialPrice} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500">Domek</label>
                <select 
                  value={editingSpecialPrice.houseId}
                  onChange={(e) => setEditingSpecialPrice({ ...editingSpecialPrice, houseId: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Wszystkie domki</option>
                  {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Od</label>
                  <input 
                    type="date"
                    value={editingSpecialPrice.startDate}
                    onChange={(e) => setEditingSpecialPrice({ ...editingSpecialPrice, startDate: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500">Do</label>
                  <input 
                    type="date"
                    value={editingSpecialPrice.endDate}
                    onChange={(e) => setEditingSpecialPrice({ ...editingSpecialPrice, endDate: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500">Cena za dobę (PLN)</label>
                <input 
                  type="number"
                  value={editingSpecialPrice.price}
                  onChange={(e) => setEditingSpecialPrice({ ...editingSpecialPrice, price: Number(e.target.value) })}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500">Etykieta (opcjonalnie)</label>
                <input 
                  type="text"
                  value={editingSpecialPrice.label || ''}
                  onChange={(e) => setEditingSpecialPrice({ ...editingSpecialPrice, label: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  type="submit"
                  disabled={isProcessing === 'save-special'}
                  className="flex-1 bg-accent text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isProcessing === 'save-special' ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Zapisz zmiany</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
