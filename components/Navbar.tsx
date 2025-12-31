
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { ViewState } from '../App';

interface NavbarProps {
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-[80] transition-all duration-300 ${isScrolled || currentView !== 'landing' ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center">
            <button onClick={() => onNavigate('landing')} className="flex items-center group outline-none">
              <Logo iconSize={52} />
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-600 uppercase tracking-wider">
            {(currentView === 'landing' || currentView === 'pricing') && (
              <>

                <button
                  onClick={() => onNavigate('pricing')}
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
              <button onClick={() => onNavigate('landing')} className="hover:text-brand-600 transition">Início</button>
            )}
            <button
              onClick={() => onNavigate('login')}
              className={`transition ${currentView === 'login' ? 'text-brand-600' : 'hover:text-brand-600'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full text-[11px] font-black transition shadow-lg hover:shadow-brand-500/30 uppercase"
            >
              Criar Conta
            </button>
          </div>

          {/* Mobile Menu Button - Simplificado para demo */}
          <div className="md:hidden">
            <button onClick={() => onNavigate('login')} className="text-brand-600 font-bold text-xs uppercase">
              Entrar
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
