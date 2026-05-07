import React from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { pl } from 'date-fns/locale';
import { format, addDays, isBefore, startOfToday, isSameDay, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, User, Mail, Phone, CheckCircle2, Loader2, Info, Tag } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HOUSES } from '../constants';
import { SpecialPrice, GlobalSettings, Reservation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { parseDateLocal } from '../lib/dateUtils';
import 'react-day-picker/dist/style.css';

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

interface BookingSectionProps {
  initialHouseId?: string;
}

export default function BookingSection({ initialHouseId }: BookingSectionProps) {
  const [selectedHouseId, setSelectedHouseId] = React.useState(initialHouseId || HOUSES[0].id);
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [bookedDates, setBookedDates] = React.useState<Date[]>([]);
  const [specialPrices, setSpecialPrices] = React.useState<SpecialPrice[]>([]);
  const [houseSettings, setHouseSettings] = React.useState<Record<string, number>>({});
  const [globalSettings, setGlobalSettings] = React.useState<GlobalSettings>({
    id: 'default',
    depositType: 'percent',
    depositValue: 30,
    daysToPayDeposit: 3
  });

  // Fetch pricing data reactively
  React.useEffect(() => {
    const unsubHS = onSnapshot(collection(db, 'house_settings'), (snapshot) => {
      const hs: Record<string, number> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.basePrice) hs[doc.id] = data.basePrice;
      });
      setHouseSettings(hs);
    });

    const unsubSP = onSnapshot(collection(db, 'special_prices'), (snapshot) => {
      const sp: SpecialPrice[] = [];
      snapshot.forEach(doc => sp.push({ id: doc.id, ...doc.data() } as SpecialPrice));
      setSpecialPrices(sp);
    });

    const unsubGS = onSnapshot(collection(db, 'global_settings'), (snapshot) => {
      if (!snapshot.empty) {
        const gsData = snapshot.docs[0].data() as GlobalSettings;
        setGlobalSettings({ ...gsData, id: snapshot.docs[0].id });
      }
    });

    return () => {
      unsubHS();
      unsubSP();
      unsubGS();
    };
  }, []);

  // Fetch booked dates for the selected house
  React.useEffect(() => {
    async function fetchBookedDates() {
      const path = 'reservations';
      try {
        const q = query(
          collection(db, path),
          where('houseId', '==', selectedHouseId),
          where('status', 'in', ['pending', 'confirmed'])
        );
        
        const querySnapshot = await getDocs(q);
        const dates: Date[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const start = new Date(data.startDate);
          const end = new Date(data.endDate);
          
          let current = start;
          while (current <= end) {
            dates.push(new Date(current));
            current = addDays(current, 1);
          }
        });
        
        setBookedDates(dates);
      } catch (error) {
        console.error('Błąd pobierania terminów:', error);
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
    
    fetchBookedDates();
  }, [selectedHouseId, success]);

  const calculateTotal = () => {
    if (!range?.from || !range?.to || isSameDay(range.from, range.to)) return { total: 0, hasSpecial: false, deposit: 0 };
    
    let total = 0;
    let current = range.from;
    const end = range.to;
    let hasSpecial = false;

    // Calculate per night
    while (isBefore(current, end)) {
      const applicableSpecials = specialPrices.filter(sp => 
        sp.houseId === selectedHouseId && 
        isWithinInterval(current, { 
          start: parseDateLocal(sp.startDate), 
          end: parseDateLocal(sp.endDate) 
        })
      );

      if (applicableSpecials.length > 0) {
        const minSpecial = Math.min(...applicableSpecials.map(s => s.price));
        total += minSpecial;
        hasSpecial = true;
      } else {
        total += houseSettings[selectedHouseId] || HOUSES.find(h => h.id === selectedHouseId)?.priceBase || 0;
      }
      
      current = addDays(current, 1);
    }

    const deposit = globalSettings.depositType === 'percent' 
      ? Math.round((total * globalSettings.depositValue) / 100)
      : globalSettings.depositValue;

    return { total, hasSpecial, deposit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!range?.from || !range?.to) {
      alert('Proszę wybrać zakres dat.');
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotal();

    try {
      await addDoc(collection(db, 'reservations'), {
        houseId: selectedHouseId,
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        message: formData.message,
        totalPrice: totals.total,
        depositAmount: totals.deposit,
        isDepositPaid: false,
        isFullyPaid: false,
        status: 'confirmed', // Automatically accepted
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setRange(undefined);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error adding reservation: ', error);
      alert('Wystąpił błąd podczas wysyłania rezerwacji. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBooked = (date: Date) => {
    return bookedDates.some(d => isSameDay(d, date));
  };

  const today = startOfToday();

  return (
    <div className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Rezerwacja online</h2>
          <p className="text-gray-600 text-lg">
            Wybierz termin i wyślij prośbę o rezerwację. Skontaktujemy się z Tobą w celu potwierdzenia szczegółów.
          </p>
        </div>

        <div className="max-w-6xl mx-auto bg-white rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-xl border border-gray-100">
          {/* Calendar Side */}
          <div className="lg:col-span-8 p-8 lg:p-12 bg-white">
            <div className="mb-10">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Wybierz domek</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {HOUSES.map((house) => (
                  <button
                    key={house.id}
                    onClick={() => setSelectedHouseId(house.id)}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                      selectedHouseId === house.id 
                        ? 'border-accent bg-accent/5 text-accent' 
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {house.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-12 items-start justify-center">
              <div className="w-full max-w-sm mx-auto md:mx-0 rd-calendar-container">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  locale={pl}
                  modifiers={{ booked: bookedDates }}
                  modifiersClassNames={{ booked: 'bg-red-100 text-red-400 line-through' }}
                  disabled={[{ before: today }, isBooked]}
                  numberOfMonths={1}
                  className="mx-auto"
                />
              </div>
              <div className="flex-1 space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-gray-800">
                    <CalendarIcon size={20} className="text-primary-600" />
                    Wybrany termin
                  </h4>
                  {range?.from ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Przyjazd:</span>
                        <span className="font-bold">{format(range.from, 'dd.MM.yyyy')}</span>
                      </div>
                      {range.to && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Wyjazd:</span>
                          <span className="font-bold">{format(range.to, 'dd.MM.yyyy')}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline text-base pt-3 border-t border-gray-200 mt-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">Razem do zapłaty:</span>
                        </div>
                        <span className="font-black text-accent text-xl tracking-tighter">{calculateTotal().total} zł</span>
                      </div>
                      
                      <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                            <Tag size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider leading-none">Zaliczka do wpłaty</p>
                          </div>
                        </div>
                        <span className="text-lg font-black text-blue-600">{calculateTotal().deposit} zł</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Proszę wybrać datę przyjazdu i wyjazdu w kalendarzu.</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                    <span>Termin zajęty</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-primary-600 rounded"></div>
                    <span>Twój wybór</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-4 bg-accent p-8 lg:p-12 text-white">
            <h3 className="text-2xl font-bold mb-8">Twoje dane</h3>
            
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-10"
                >
                  <CheckCircle2 size={64} className="text-green-400 mb-6" />
                  <h4 className="text-2xl font-bold mb-2">Rezerwacja potwierdzona!</h4>
                  <p className="text-gray-300 mb-8">
                    Dziękujemy. Na Twój adres e-mail wysłaliśmy instrukcje dotyczące wpłaty zaliczki. Masz na to {globalSettings.daysToPayDeposit} dni.
                  </p>
                  <button 
                    onClick={() => setSuccess(false)}
                    className="bg-white text-accent px-6 py-2 rounded-lg font-bold"
                  >
                    Kolejna rezerwacja
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit} 
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/70">Imię i Nazwisko</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 focus:bg-white/20 focus:outline-none focus:border-white transition-all"
                        placeholder="Jan Kowalski"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/70">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 focus:bg-white/20 focus:outline-none focus:border-white transition-all"
                        placeholder="twoj@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/70">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                      <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 focus:bg-white/20 focus:outline-none focus:border-white transition-all"
                        placeholder="+48 000 000 000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/70">Wiadomość (opcjonalnie)</label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 focus:bg-white/20 focus:outline-none focus:border-white transition-all resize-none"
                      placeholder="Masz dodatkowe pytania?"
                    ></textarea>
                  </div>

                  <button
                    disabled={isSubmitting || !range?.from || !range?.to}
                    type="submit"
                    className="w-full bg-primary-500 hover:bg-primary-400 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-8"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Zarezerwuj teraz'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
