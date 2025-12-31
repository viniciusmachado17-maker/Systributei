
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { ViewState } from '../App';

interface NavbarProps {
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-[80] transition-all duration-300 ${isScrolled || currentView !== 'landing' ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center">
            <button onClick={() => handleNavClick('landing')} className="flex items-center group outline-none">
              <Logo iconSize={52} />
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-600 uppercase tracking-wider">
            {(currentView === 'landing' || currentView === 'pricing') && (
              <>
                <button
                  onClick={() => handleNavClick('pricing')}
                  className={`transition ${currentView === 'pricing' ? 'text-brand-600' : 'hover:text-brand-600'}`}
                >
                  Planos
                </button>
                {currentView === 'landing' && (
                  <a href="#duvidas" className="hover:text-brand-600 transition">Dúvidas</a>
                )}
              </>
            )}

            {currentView !== 'landing' && (
              <button onClick={() => handleNavClick('landing')} className="hover:text-brand-600 transition">Início</button>
            )}
            <button
              onClick={() => handleNavClick('login')}
              className={`transition ${currentView === 'login' ? 'text-brand-600' : 'hover:text-brand-600'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => handleNavClick('signup')}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full text-[11px] font-black transition shadow-lg hover:shadow-brand-500/30 uppercase"
            >
              Criar Conta
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-brand-600 transition p-2"
            >
              <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-2xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="px-4 py-8 space-y-6 flex flex-col items-center text-center">
            {(currentView === 'landing' || currentView === 'pricing') && (
              <>
                <button
                  onClick={() => handleNavClick('pricing')}
                  className={`text-sm font-black uppercase tracking-widest ${currentView === 'pricing' ? 'text-brand-600' : 'text-slate-600'}`}
                >
                  Planos
                </button>
                {currentView === 'landing' && (
                  <a href="#duvidas" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-slate-600">Dúvidas</a>
                )}
              </>
            )}

            {currentView !== 'landing' && (
              <button onClick={() => handleNavClick('landing')} className="text-sm font-black uppercase tracking-widest text-slate-600">Início</button>
            )}

            <button
              onClick={() => handleNavClick('login')}
              className={`text-sm font-black uppercase tracking-widest ${currentView === 'login' ? 'text-brand-600' : 'text-slate-600'}`}
            >
              Entrar
            </button>

            <button
              onClick={() => handleNavClick('signup')}
              className="w-full bg-brand-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/20"
            >
              Criar Conta Grátis
            </button>

            <div className="pt-4 flex items-center gap-4 text-slate-400">
              <i className="fa-brands fa-whatsapp text-xl"></i>
              <span className="text-[10px] font-bold uppercase tracking-widest">Suporte Especializado</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
