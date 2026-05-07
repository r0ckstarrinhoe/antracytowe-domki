import React from 'react';
import { Users, Wifi, Waves, Dog, Car, Utensils, ArrowLeft, ArrowRight, Wind, Home as HomeIcon, Volume2, ExternalLink } from 'lucide-react';
import { House, SpecialPrice } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { parseDateLocal } from '../lib/dateUtils';

const amenityIcons: Record<string, React.ReactNode> = {
  'Prywatna balia z jacuzzi': <Waves size={18} />,
  'Prywatna balia z jacuzzi (drewno w cenie)': <Waves size={18} />,
  'Duży taras': <ArrowRight size={18} />,
  'Duży taras z meblami': <ArrowRight size={18} />,
  'W pełni wyposażona kuchnia': <Utensils size={18} />,
  'Darmowe WiFi': <Wifi size={18} />,
  'WiFi + Smart TV': <Wifi size={18} />,
  'Zwierzęta mile widziane': <Dog size={18} />,
  'Brak opłat za psa': <Dog size={18} />,
  'Grill i palenisko': <Wind size={18} />,
  'Parking na posesji': <Car size={18} />,
  'Zadaszona altana': <HomeIcon size={18} />,
  'Kącik czytelniczy': <Users size={18} />,
  'Sprzęt muzyczny': <Volume2 size={18} />
};

export default function HouseCard({ house }: { house: House }) {
  const [currentImage, setCurrentImage] = React.useState(0);
  const [houseMinPrice, setHouseMinPrice] = React.useState<number>(house.priceBase);

  React.useEffect(() => {
    let hsPrices: number[] = [house.priceBase];
    let spPrices: number[] = [];

    const updateMinPrice = () => {
      const all = [...hsPrices, ...spPrices];
      if (all.length > 0) {
        setHouseMinPrice(Math.min(...all));
      }
    };

    const unsubHS = onSnapshot(collection(db, 'house_settings'), (snapshot) => {
      let currentBasePrice = house.priceBase;
      snapshot.forEach(doc => {
        if (doc.id === house.id) {
          const data = doc.data();
          if (data.basePrice) currentBasePrice = data.basePrice;
        }
      });
      hsPrices = [currentBasePrice];
      updateMinPrice();
    });

    const unsubSP = onSnapshot(collection(db, 'special_prices'), (snapshot) => {
      const newSP: number[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.houseId === house.id && data.price) {
          const endDate = parseDateLocal(data.endDate);
          endDate.setHours(23, 59, 59, 999);

          if (endDate >= today) {
            newSP.push(data.price);
          }
        }
      });
      spPrices = newSP;
      updateMinPrice();
    });

    return () => {
      unsubHS();
      unsubSP();
    };
  }, [house.id]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % house.images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + house.images.length) % house.images.length);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start py-12">
      {/* Gallery Section */}
      <div className="relative group rounded-3xl overflow-hidden shadow-2xl bg-gray-200 aspect-[4/3]">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={house.images[currentImage]}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

        {/* Navigation Arrows */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={prevImage}
            className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-all shadow-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={nextImage}
            className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-all shadow-lg"
          >
            <ArrowRight size={24} />
          </button>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {house.images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === currentImage ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
            ></div>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-col h-full justify-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-primary-50 px-3 py-1 rounded-full border border-primary-100 text-primary-600 font-bold">
            <Users size={16} />
            <span>Do {house.capacity} osób</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/5 text-accent rounded-full text-[10px] font-black uppercase tracking-wider border border-accent/10">
            Premium House
          </div>
        </div>

        <h3 className="text-4xl font-display font-bold mb-6">{house.name}</h3>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {house.description} Obiekt posiada 2 sypialnie, salon z rozkładaną sofą i w pełni wyposażony aneks kuchenny.
        </p>

        <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-10">
          {house.amenities.map((amenity) => (
            <div key={amenity} className="flex items-center gap-3 text-gray-700 group">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                {amenityIcons[amenity] || <HomeIcon size={18} />}
              </div>
              <span className="text-sm font-bold tracking-tight">{amenity}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-1">Cena od</p>
            <p className="text-3xl font-display font-bold text-accent">
              {houseMinPrice} zł <span className="text-base font-normal text-gray-400">/ doba</span>
            </p>
          </div>
          <Link
            to={`/nasze-domki#${house.id}`}
            className="flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-accent/20"
          >
            <span>Zobacz więcej</span>
            <ExternalLink size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
