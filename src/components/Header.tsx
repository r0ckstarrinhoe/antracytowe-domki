import React from 'react';
import { Menu, Home, Phone, Calendar, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Header() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

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

  const navLinks = [
    { name: 'Strona Główna', id: 'start' },
    { name: 'O nas', id: 'o-nas' },
    { name: 'Nasze Domki', path: '/nasze-domki' },
    { name: 'Oferta', id: 'domki' },
    { name: 'Kontakt', id: 'kontakt' },
  ];

  return (
    <header 
      className={`fixed left-0 right-0 z-50 transition-all duration-700 flex justify-center ${
        isScrolled 
          ? 'top-6 px-4' 
          : 'top-0 px-0 translate-y-0'
      }`}
    >
      <div 
        className={`container mx-auto flex justify-between items-center transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-3 px-10 rounded-[2.5rem]' 
            : isMobileMenuOpen 
              ? 'bg-white shadow-lg py-4 px-4' 
              : 'bg-transparent py-8 px-4'
        }`}
      >
        <Link 
          to="/" 
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-3 group relative z-50"
        >
          <div className={`w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-xl shadow-accent/10 transition-all duration-500 ${isScrolled ? 'scale-90' : 'scale-100 rotate-3'}`}>
            <Home className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold leading-none text-accent text-lg tracking-tight">
              Antracytowe Domki
            </h1>
            <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-primary-600/70 mt-1">
              NAD ZALEWEM CHAŃCZA
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-4 font-display font-medium text-sm tracking-wide">
          {navLinks.map((link) => (
            link.path ? (
              <Link 
                key={link.path}
                to={link.path}
                className="px-4 py-2 text-gray-500 hover:text-accent transition-all relative group/link"
              >
                {link.name}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-accent scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
              </Link>
            ) : (
              <a 
                key={link.id}
                href={`#${link.id}`} 
                onClick={(e) => handleNavClick(e, link.id!)}
                className="px-4 py-2 text-gray-500 hover:text-accent transition-all relative group/link"
              >
                {link.name}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-accent scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
              </a>
            )
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <Link 
            to="/rezerwacja" 
            className="hidden sm:flex bg-accent text-white px-8 py-3 rounded-2xl font-display font-bold text-sm transition-all shadow-xl shadow-accent/10 hover:shadow-accent/20 hover:-translate-y-0.5 active:translate-y-0 items-center gap-2"
          >
            <span>Rezerwacja</span>
          </Link>

          {/* Mobile Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-accent hover:bg-gray-100 transition-colors z-50"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="lg:hidden absolute top-[calc(100%+1rem)] left-4 right-4 bg-white rounded-[2rem] shadow-2xl p-6 flex flex-col gap-1 overflow-hidden"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.id || link.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {link.path ? (
                  <Link 
                    to={link.path}
                    className="flex items-center justify-between p-4 rounded-xl font-display font-bold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    {link.name}
                    <ChevronRight size={18} className="text-gray-300" />
                  </Link>
                ) : (
                  <a 
                    href={`#${link.id}`} 
                    onClick={(e) => handleNavClick(e, link.id!)}
                    className="flex items-center justify-between p-4 rounded-xl font-display font-bold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    {link.name}
                    <ChevronRight size={18} className="text-gray-300" />
                  </a>
                )}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: navLinks.length * 0.05 }}
              className="mt-4"
            >
              <Link 
                to="/rezerwacja" 
                className="flex items-center justify-center gap-3 p-5 bg-accent text-white rounded-2xl font-display font-bold transition-all shadow-xl shadow-accent/10"
              >
                <Calendar size={18} />
                Zarezerwuj pobyt
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
