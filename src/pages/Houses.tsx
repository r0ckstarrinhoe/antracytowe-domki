import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { HOUSES } from '../constants';
import { Check, Users, Maximize, Wind, Tv, Coffee, Shield, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseDateLocal } from '../lib/dateUtils';

export default function Houses() {
  const location = useLocation();
  const [activeGallery, setActiveGallery] = useState<{houseId: string, index: number} | null>(null);
  const [housePrices, setHousePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Current date for special price filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Track state internally to avoid multiple quick re-renders
    let hsMap: Record<string, number> = {};
    let spMap: Record<string, number[]> = {};

    const updateCalculatedPrices = () => {
      const newPrices: Record<string, number> = {};
      HOUSES.forEach(house => {
        const base = hsMap[house.id] || house.priceBase;
        const specials = spMap[house.id] || [];
        newPrices[house.id] = Math.min(base, ...specials);
      });
      setHousePrices(newPrices);
    };

    const unsubHS = onSnapshot(collection(db, 'house_settings'), (snapshot) => {
      const newHS: Record<string, number> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.basePrice) {
          newHS[doc.id] = data.basePrice;
        }
      });
      hsMap = newHS;
      updateCalculatedPrices();
    });

    const unsubSP = onSnapshot(collection(db, 'special_prices'), (snapshot) => {
      const newSP: Record<string, number[]> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.houseId && data.price) {
          const endDate = parseDateLocal(data.endDate);
          endDate.setHours(23, 59, 59, 999);
          
          if (endDate >= today) {
            if (!newSP[data.houseId]) newSP[data.houseId] = [];
            newSP[data.houseId].push(data.price);
          }
        }
      });
      spMap = newSP;
      updateCalculatedPrices();
    });

    return () => {
      unsubHS();
      unsubSP();
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash, location.pathname]);

  const amenities = [
    { icon: <Users size={20} />, text: '4-6 osób' },
    { icon: <Maximize size={20} />, text: '35m² + antresola' },
    { icon: <Wind size={20} />, text: 'Klimatyzacja' },
    { icon: <Tv size={20} />, text: 'Smart TV' },
    { icon: <Coffee size={20} />, text: 'Aneks kuchenny' },
    { icon: <Shield size={20} />, text: 'Monitoring' },
  ];

  const currentHouse = activeGallery ? HOUSES.find(h => h.id === activeGallery.houseId) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Lightbox Gallery */}
      <AnimatePresence>
        {activeGallery && currentHouse && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setActiveGallery(null)}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X size={40} />
            </button>

            <button 
              onClick={() => {
                const newIndex = (activeGallery.index - 1 + currentHouse.images.length) % currentHouse.images.length;
                setActiveGallery({ ...activeGallery, index: newIndex });
              }}
              className="absolute left-4 md:left-12 text-white/30 hover:text-white transition-colors"
            >
              <ChevronLeft size={60} />
            </button>

            <motion.div 
              key={activeGallery.index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative aspect-[16/9] w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <img 
                src={currentHouse.images[activeGallery.index]} 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 font-bold">
                {activeGallery.index + 1} / {currentHouse.images.length}
              </div>
            </motion.div>

            {/* Thumbnails */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 py-4 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 max-w-[90vw] overflow-x-auto no-scrollbar">
              {currentHouse.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGallery({ ...activeGallery, index: i })}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0 ${
                    activeGallery.index === i 
                      ? 'scale-110 ring-4 ring-accent' 
                      : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                const newIndex = (activeGallery.index + 1) % currentHouse.images.length;
                setActiveGallery({ ...activeGallery, index: newIndex });
              }}
              className="absolute right-4 md:right-12 text-white/30 hover:text-white transition-colors"
            >
              <ChevronRight size={60} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 mb-20 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-sm border border-primary-200"
          >
            <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
            Standard Premium
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-black text-accent mb-6"
          >
            Nasze Domki
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Trzy wyjątkowe przestrzenie, zaprojektowane z myślą o Twoim komforcie i bliskości z naturą.
          </motion.p>
        </div>

        <div className="space-y-32">
          {HOUSES.map((house, index) => (
            <section 
              key={house.id} 
              id={house.id} 
              className={`scroll-mt-32 ${index % 2 === 1 ? 'bg-primary-50/30 border-y border-primary-100/50 py-24' : 'py-12'}`}
            >
              <div className="container mx-auto px-4">
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  <motion.div 
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`relative ${index % 2 === 1 ? 'lg:order-2' : ''}`}
                  >
                    <div className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl relative group">
                      <img 
                        src={house.images[0]} 
                        alt={house.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <button 
                        onClick={() => setActiveGallery({ houseId: house.id, index: 0 })}
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 font-bold text-accent shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <ImageIcon size={20} />
                          Otwórz galerię
                        </div>
                      </button>
                    </div>
                    <div className="absolute -bottom-8 -right-8 bg-accent text-white p-8 rounded-3xl shadow-xl hidden md:block">
                      <p className="text-sm opacity-60 mb-1">Cena od</p>
                      <p className="text-3xl font-black">
                        {housePrices[house.id] || house.priceBase} zł
                        <span className="text-lg font-normal opacity-60"> / doba</span>
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={index % 2 === 1 ? 'lg:order-1' : ''}
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
                      Wyjątkowy standard
                    </div>
                    <h2 className="text-4xl md:text-5xl font-display font-black text-accent mb-8">
                      {house.name}
                    </h2>
                    <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                      Luksusowy całoroczny domek oddany do użytku w 2024 roku. Wykończony w najwyższym standardzie, 
                      łączący nowoczesną bryłę z ciepłem naturalnych materiałów. Przestronny taras pozwala cieszyć się 
                      poranną kawą w otoczeniu zieleni i śpiewu ptaków.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
                      {amenities.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-gray-700 group">
                          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                            {item.icon}
                          </div>
                          <span className="text-sm font-bold tracking-tight">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 mb-12">
                      {[
                        'Prywatny taras z meblami wypoczynkowymi',
                        'W pełni wyposażony aneks kuchenny',
                        'Bezpieczny, ogrodzony teren obiektu',
                        'Bezpłatny parking tuż przy domku'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 group">
                          <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <Check size={16} />
                          </div>
                          <span className="text-gray-700 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Link 
                        to={`/rezerwacja?house=${house.id}`}
                        className="inline-flex items-center gap-3 px-10 py-5 bg-accent text-white rounded-2xl font-display font-bold hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
                      >
                        Zarezerwuj teraz
                      </Link>
                      <button 
                        onClick={() => setActiveGallery({ houseId: house.id, index: 0 })}
                        className="inline-flex items-center gap-3 px-10 py-5 bg-white text-accent border-2 border-accent/10 rounded-2xl font-display font-bold hover:bg-gray-50 transition-all"
                      >
                        <ImageIcon size={20} />
                        Galeria zdjęć
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
