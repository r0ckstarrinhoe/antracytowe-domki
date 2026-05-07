import React from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/#' + targetId);
    } else {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer id="kontakt" className="py-24 bg-accent text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div>
            <h3 className="text-3xl font-display font-bold mb-8 text-white">Kontakt</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Zadzwoń do nas</p>
                  <p className="text-xl font-bold">+48 123 456 789</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Napisz e-mail</p>
                  <p className="text-xl font-bold">kontakt@antracytowedomki.pl</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Adres</p>
                  <p className="text-xl font-bold">Życiny 208B, 26-035 Raków</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <h4 className="text-xl font-bold mb-6 text-white">Nawigacja</h4>
                <ul className="space-y-4">
                  <li>
                    <a href="#start" onClick={(e) => handleNavClick(e, 'start')} className="text-white/60 hover:text-white transition-colors">Strona Główna</a>
                  </li>
                  <li>
                    <a href="#o-nas" onClick={(e) => handleNavClick(e, 'o-nas')} className="text-white/60 hover:text-white transition-colors">O nas</a>
                  </li>
                  <li>
                    <Link to="/nasze-domki" className="text-white/60 hover:text-white transition-colors">Nasze domki</Link>
                  </li>
                  <li>
                    <Link to="/rezerwacja" className="text-white/60 hover:text-white transition-colors">Rezerwacja</Link>
                  </li>
                </ul>
              </div>
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <h4 className="text-xl font-bold mb-6 text-white">Nasze Social Media</h4>
                <p className="text-white/60 mb-6">Obserwuj nas, aby być na bieżąco z nowościami i promocjami.</p>
                <div className="flex items-center gap-6">
                  <a href="#" className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white">
                    <Instagram size={24} />
                  </a>
                  <a href="#" className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white">
                    <Facebook size={24} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Antracytowe Domki. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  );
}
