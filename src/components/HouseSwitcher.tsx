import React from 'react';
import { HOUSES } from '../constants';
import HouseCard from './HouseCard';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Home as HomeIcon } from 'lucide-react';

export default function HouseSwitcher() {
  const [activeHouseId, setActiveHouseId] = React.useState(HOUSES[0].id);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const activeHouse = HOUSES.find(h => h.id === activeHouseId)!;

  const switchHouse = (direction: 'next' | 'prev') => {
    const currentIndex = HOUSES.findIndex(h => h.id === activeHouseId);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % HOUSES.length;
    } else {
      nextIndex = (currentIndex - 1 + HOUSES.length) % HOUSES.length;
    }
    
    const nextHouseId = HOUSES[nextIndex].id;
    setActiveHouseId(nextHouseId);
    
    // Scroll active tab into view
    if (scrollRef.current) {
      const activeTab = scrollRef.current.querySelector(`[data-house-id="${nextHouseId}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  return (
    <section id="domki" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-primary-600 mb-4">Nasza oferta</h2>
          <h3 className="text-4xl md:text-5xl font-display font-bold mb-6">Wybierz swój idealny <span className="italic text-primary-500">odpoczynek</span></h3>
          <p className="text-gray-600 text-lg">
            Oferujemy trzy unikalne domki, każdy zaprojektowany z myślą o najwyższym komforcie i bliskości natury. Wszystkie wyposażone w prywatną balię.
          </p>
        </div>

        {/* New Architectural Tab Switcher */}
        <div className="flex justify-center mb-16 px-4">
          <div className="relative flex items-center bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-2 overflow-hidden">
            {/* Prev Arrow */}
            <button 
              onClick={() => switchHouse('prev')}
              className="w-12 h-12 flex items-center justify-center text-accent hover:bg-gray-50 rounded-xl transition-all active:scale-95 group"
              aria-label="Previous house"
            >
              <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Active Label & Counter */}
            <div className="px-8 flex flex-col items-center min-w-[180px]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-1">
                Wybierz domek
              </span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeHouseId}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-xl font-display font-black text-accent whitespace-nowrap">
                    {activeHouse.name}
                  </span>
                  <div className="flex gap-1 justify-center md:hidden">
                    {HOUSES.map((h, i) => (
                      <div 
                        key={h.id}
                        className={`w-1 h-1 rounded-full transition-all duration-500 ${
                          activeHouseId === h.id ? 'w-4 bg-accent' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next Arrow */}
            <button 
              onClick={() => switchHouse('next')}
              className="w-12 h-12 flex items-center justify-center text-accent hover:bg-gray-50 rounded-xl transition-all active:scale-95 group"
              aria-label="Next house"
            >
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            <div className="hidden lg:flex items-center gap-2 px-4 border-l border-gray-100">
               {HOUSES.map((house) => (
                 <button
                   key={house.id}
                   onClick={() => setActiveHouseId(house.id)}
                   className={`w-2 h-2 rounded-full transition-all duration-300 ${
                     activeHouseId === house.id 
                       ? 'bg-accent scale-150' 
                       : 'bg-gray-200 hover:bg-gray-300'
                   }`}
                   aria-label={`Wybierz ${house.name}`}
                 />
               ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHouseId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <HouseCard 
                house={activeHouse} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
