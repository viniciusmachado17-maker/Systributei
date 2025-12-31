
import React from 'react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <Logo iconSize={72} />
            </div>
            <p className="text-slate-500 text-sm max-w-xs">
              Ajudando empresas a entenderem e aplicarem a nova reforma tributária de forma simples, rápida e transparente.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-brand-600">Início</a></li>

              <li><a href="#duvidas" className="hover:text-brand-600">Dúvidas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>suporte@tributeiclass.com.br</li>
              <li>(34) 99156-4540</li>
              <li>Uberlândia, MG</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">© 2025 TributeiClass. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/tributeiclass_oficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-brand-600 transition"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://wa.me/5534991564540" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 transition" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
