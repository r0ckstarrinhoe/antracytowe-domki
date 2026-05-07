import Header from '../components/Header';
import Hero from '../components/Hero';
import HouseSwitcher from '../components/HouseSwitcher';
import Footer from '../components/Footer';
import React from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Home() {
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        
        {/* About Section */}
        <section id="o-nas" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-primary-600 mb-4">O nas</h2>
                <h3 className="text-4xl font-display font-bold mb-8 leading-tight">
                  Nowoczesny wypoczynek w harmonii z <span className="text-primary-500 italic">naturą</span>
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Antracytowe domki to projekt zrodzony z pasji do nowoczesnej architektury i miłości do świętokrzyskiej przyrody. Znajdujemy się w Życinach, zaledwie kilka kroków od brzegów Zalewu Chańcza.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="font-bold text-black flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                      3 nowoczesne obiekty
                    </p>
                    <p className="text-sm text-gray-500">Zaprojektowane dla grup do 8 osób każda.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-black flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                      Prywatne Jacuzzi
                    </p>
                    <p className="text-sm text-gray-500">Każdy domek posiada własną balię opalaną drewnem.</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&q=80&w=1200" 
                  alt="Domki w lesie" 
                  className="rounded-3xl shadow-2xl z-10 relative"
                />
                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary-100 rounded-3xl -z-0"></div>
                <div className="absolute -top-6 -left-6 w-32 h-32 border-2 border-primary-200 rounded-3xl -z-0"></div>
              </div>
            </div>
          </div>
        </section>

        <HouseSwitcher />
        
        <Footer />
      </main>
    </div>
  );
}
