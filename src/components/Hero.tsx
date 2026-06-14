import React from 'react';
import { ChevronRight, Star, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HOUSES } from '../constants';
import { Link } from 'react-router-dom';

export default function Hero() {
  const [minPrice, setMinPrice] = React.useState<number>(Math.min(...HOUSES.map(h => h.priceBase)));

  React.useEffect(() => {
    let hsPrices: number[] = [...HOUSES.map(h => h.priceBase)];
    let spPrices: number[] = [];

    const updateMin = () => {
      const all = [...hsPrices, ...spPrices];
      if (all.length > 0) {
        setMinPrice(Math.min(...all));
      }
    };

    const unsubHS = onSnapshot(collection(db, 'house_settings'), (snapshot) => {
      const dbBasePrices: Record<string, number> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.basePrice) dbBasePrices[doc.id] = data.basePrice;
      });
      hsPrices = HOUSES.map(h => dbBasePrices[h.id] || h.priceBase);
      updateMin();
    });

    const unsubSP = onSnapshot(collection(db, 'special_prices'), (snapshot) => {
      const newSP: number[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.price) {
          const endDate = new Date(data.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (endDate >= today) {
            newSP.push(data.price);
          }
        }
      });
      spPrices = newSP;
      updateMin();
    });

    return () => {
      unsubHS();
      unsubSP();
    };
  }, []);

  return (
    <section id="start" className="relative h-screen flex items-center overflow-hidden bg-white">
      {/* Background/Image Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=2000" 
          alt="Nowoczesny domek antracytowy" 
          className="w-full h-full object-cover"
        />
        {/* Soft Dark Overlay */}
        <div className="absolute inset-0 bg-black/45 z-10"></div>
      </div>

      <div className="container mx-auto px-4 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 mb-6 bg-white/10 backdrop-blur-sm border border-white/20 w-fit px-4 py-1.5 rounded-full text-white text-sm font-semibold">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span>Najwyżej oceniane domki nad Zalewem</span>
          </div>

          <h2 className="text-5xl md:text-8xl font-display font-bold text-white mb-8 leading-[1.1] tracking-tight">
            Twój azyl <br/>w sercu <span className="text-primary-400">lasu</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-xl leading-relaxed">
            Nowoczesne domki z prywatną balią i jacuzzi. 5 minut spacerem do plaży, 100% prywatności i natury.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Link 
              to="/rezerwacja" 
              className="bg-accent hover:scale-105 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-2xl shadow-accent/30"
            >
              Rezerwuj teraz
              <ChevronRight size={24} />
            </Link>
            
            <div className="flex flex-col gap-2">
              <a 
                href="https://maps.app.goo.gl/MyRwj3eRNfVi2Lzs9" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/90 hover:text-white transition-colors group"
              >
                <MapPin size={20} className="text-primary-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold border-b border-transparent group-hover:border-primary-600">Życiny 208B, 26-035 Raków</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating features */}
      <div className="absolute bottom-10 right-10 hidden lg:block z-30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-6 max-w-[300px] border border-gray-50"
        >
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Cena już od</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold font-display text-accent">{minPrice} zł</span>
              <span className="text-gray-400 font-medium">/ doba</span>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>
          <ul className="space-y-4">
            {[
              'Prywatna gorąca balia',
              'Komfort dla 8 osób',
              'Plaża tylko 5 min',
              'WiFi + Smart TV'
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
