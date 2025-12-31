import React, { useState } from 'react';
import logoImg from './logo.png';

interface LogoProps {
  className?: string;
  iconSize?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", iconSize = 64 }) => {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div
        className="relative flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden shadow-sm border border-slate-200"
        style={{
          width: iconSize,
          height: iconSize,
          background: '#f8fafc' // Slate-50 (off-white)
        }}
      >
        {/* Ícone de Fundo */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-1/2 h-1/2 text-brand-600/10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Imagem do Usuário */}
        {!hasImageError && (
          <img
            src={logoImg}
            alt="Tributei Logo"
            className="absolute inset-0 w-full h-full object-contain p-2"
            onError={() => {
              console.warn("Logo: Não foi possível carregar a imagem local.");
              setHasImageError(true);
            }}
          />
        )}

        {/* Fallback se a imagem falhar */}
        {hasImageError && (
          <div className="absolute inset-0 flex items-center justify-center text-brand-600 font-black text-2xl italic select-none">
            T
          </div>
        )}
      </div>

      <div className="flex flex-col leading-none select-none">
        <span className="text-slate-900 font-extrabold text-3xl tracking-tighter">Tributei</span>
        <span className="text-brand-600 font-black text-4xl tracking-tighter uppercase italic -mt-2">Class</span>
      </div>
    </div>
  );
};

export default Logo;
