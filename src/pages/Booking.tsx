import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BookingSection from '../components/BookingSection';
import Footer from '../components/Footer';
import { ArrowLeft, Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

export default function Booking() {
  const [searchParams] = useSearchParams();
  const houseId = searchParams.get('house') || undefined;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 mt-12 -mb-20 relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-accent transition-colors font-bold bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-gray-100"
          >
            <ArrowLeft size={20} />
            Powrót
          </button>
        </div>

        <BookingSection initialHouseId={houseId} />
      </main>

      <Footer />
    </div>
  );
}
