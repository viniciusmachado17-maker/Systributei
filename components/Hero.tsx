
import React, { useState, useRef, useEffect } from 'react';
import { calculateTaxes, findProduct } from '../services/taxService';
import { Product, TaxBreakdown } from '../types';
import { MOCK_PRODUCTS } from '../constants';
import { createDemoRequest } from '../services/supabaseClient';

const Hero: React.FC = () => {
  const [demoProduct, setDemoProduct] = useState<Product | null>(null);
  const [demoTaxes, setDemoTaxes] = useState<TaxBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isBtnPressed, setIsBtnPressed] = useState(false);

  // Estados para o Modal de Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const phoneRef = useRef<HTMLDivElement>(null);

  const simulateSearch = (isAuto = false) => {
    const randomProduct = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];

    setIsLoading(true);
    setDemoProduct(null);
    setDemoTaxes(null);
    setInputValue(randomProduct.ean); // Corrigido barcode -> ean

    if (isAuto) setIsBtnPressed(true);

    setTimeout(() => {
      setDemoProduct(randomProduct);
      setDemoTaxes(calculateTaxes(randomProduct));
      setIsLoading(false);
      setIsBtnPressed(false);
    }, 1200);
  };

  useEffect(() => {
    const initialTimeout = setTimeout(() => simulateSearch(true), 1500);
    const interval = setInterval(() => {
      simulateSearch(true);
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const contactExpert = () => {
    window.open("https://wa.me/5534991564540", "_blank");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Enviar para o Supabase
    const { success } = await createDemoRequest(formData);

    if (success) {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSuccess(false);
        setFormData({ name: '', phone: '', email: '' });
      }, 2500);
    } else {
      setIsSubmitting(false);
      alert('Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente.');
    }
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-accent-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <div className="space-y-10 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
              Nova Reforma Tributária
            </div>

            <h1 className="text-4xl lg:text-7xl font-black leading-[1.1] text-slate-900 tracking-tighter">
              Chega de confusão com <br className="hidden lg:block" />
              <span className="gradient-text">IBS e CBS</span>!
            </h1>

            <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-2xl font-medium">
              O governo mudou as regras, mas sua vida não precisa ficar complicada. Descubra de forma simplificada em <strong>segundos</strong>, qual a tributação de <strong>IBS e CBS</strong> de seus produtos.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <button onClick={contactExpert} className="flex items-center justify-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-brand-700 transition shadow-2xl hover:shadow-brand-600/40 transform hover:-translate-y-1 active:scale-95">
                <i className="fa-brands fa-whatsapp text-xl"></i>
                Falar com Especialista
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-black text-lg hover:bg-slate-50 transition shadow-sm active:scale-95">
                <i className="fa-regular fa-calendar-check text-brand-600 text-xl"></i>
                Agendar Demonstração
              </button>
            </div>

            <div className="pt-6 flex items-center gap-6">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://picsum.photos/seed/user1/100/100" alt="User" />
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://picsum.photos/seed/user2/100/100" alt="User" />
                <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://picsum.photos/seed/user3/100/100" alt="User" />
              </div>
              <p className="text-sm text-slate-500 font-semibold tracking-tight">Mais de <span className="text-brand-600 font-black">1.000 consultas</span> realizadas hoje.</p>
            </div>
          </div>

          {/* Mockup Celular em Loop - Ajustado Comprimento para 540px */}
          <div className="relative lg:h-[540px] flex items-center justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div ref={phoneRef} className="w-[300px] h-[540px] bg-white rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[20px] bg-slate-800 rounded-b-xl z-20"></div>

              <div className="bg-brand-600 h-32 pt-10 px-6 flex flex-col justify-end pb-4 rounded-b-[2rem] shadow-lg">
                <h3 className="text-white font-bold text-base leading-tight">Consultar Produto</h3>
                <p className="text-brand-100 text-[10px]">Exemplo de Classificação</p>
              </div>

              <div className="p-4 space-y-4 h-full overflow-y-auto pb-12 bg-slate-50">
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button className="flex-1 bg-white shadow-sm py-1.5 rounded-md text-[9px] font-semibold text-slate-800 text-center">Cód. Barras</button>
                  <button className="flex-1 py-1.5 rounded-md text-[9px] font-medium text-slate-500 text-center">Nome</button>
                  <button className="flex-1 py-1.5 rounded-md text-[9px] font-medium text-slate-500 text-center">NCM</button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Código Identificado</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputValue}
                      readOnly
                      placeholder="Escaneie um código..."
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-[11px] focus:outline-none transition-all"
                    />
                    <i className="fa-solid fa-barcode absolute right-4 top-3 text-brand-500 animate-pulse text-[12px]"></i>
                  </div>
                </div>

                <button
                  disabled={isLoading}
                  className={`w-full bg-brand-600 text-white py-2.5 rounded-xl font-bold text-[11px] shadow-lg transition-all ${isBtnPressed ? 'scale-95 bg-brand-700 shadow-inner' : 'shadow-brand-500/30'}`}
                >
                  {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Simular Busca'}
                </button>

                {isLoading && (
                  <div className="mt-6 flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-[9px] text-slate-400">Consultando base nacional...</p>
                  </div>
                )}

                {demoProduct && demoTaxes && !isLoading && (
                  <div className="mt-1 border border-slate-100 rounded-2xl p-3 shadow-sm bg-white animate-slide-up space-y-2.5">
                    <div className="flex items-start gap-2 border-b border-slate-100 pb-2">
                      <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 text-[10px]">
                        <i className="fa-solid fa-box"></i>
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-800 text-[10px] truncate">{demoProduct.produtos}</h4>
                        <p className="text-[8px] text-slate-500">NCM: {demoProduct.ncm}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-left">
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">CST</p>
                        <p className="text-[10px] font-bold text-slate-800 blur-[3px] select-none">{demoTaxes.cst_ibs}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">cClass</p>
                        <p className="text-[10px] font-bold text-slate-800 blur-[3px] select-none">{demoTaxes.cClass_ibs}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-brand-600 uppercase">Alíquota IBS</p>
                        <p className="text-[10px] font-bold text-brand-600 blur-[3px] select-none">{(demoTaxes.aliquotaIbs * 100).toFixed(1)}%</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-brand-400 uppercase">Redução IBS</p>
                        <p className="text-[10px] font-bold text-brand-400 blur-[3px] select-none">{demoTaxes.reducaoIbs}%</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-accent-600 uppercase">Alíquota CBS</p>
                        <p className="text-[10px] font-bold text-accent-600 blur-[3px] select-none">{(demoTaxes.aliquotaCbs * 100).toFixed(1)}%</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] font-bold text-accent-400 uppercase">Redução CBS</p>
                        <p className="text-[10px] font-bold text-accent-400 blur-[3px] select-none">{demoTaxes.reducaoCbs}%</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-center">
                      <p className="text-[8px] font-bold text-brand-600 mb-1">
                        <i className="fa-solid fa-lock mr-1"></i>
                        Acesso Restrito
                      </p>
                      <p className="text-[10px] text-slate-400 px-1 italic leading-tight">
                        Faça seu cadastro e tenha 10 consultas grátis.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Badges Flutuantes */}
            <div className="absolute -right-6 top-20 bg-white p-3 rounded-xl shadow-xl animate-float hidden lg:block" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="bg-green-100 p-1.5 rounded-full text-green-600 text-xs">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Mais Segurança</p>
                  <p className="font-bold text-slate-800 text-xs">Sem Complicações</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <div className="p-7 md:p-9">
              {isSuccess ? (
                <div className="py-10 text-center space-y-3 animate-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Solicitação Enviada!</h3>
                  <p className="text-sm text-slate-500">Um especialista entrará em contato em breve para agendar sua demonstração.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Agendar Demonstração</h3>
                    <p className="text-slate-500 text-xs">Preencha os dados abaixo e veja como a TributeiClass pode transformar sua gestão fiscal.</p>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                      <div className="relative">
                        <input
                          required
                          type="text"
                          placeholder="Seu nome aqui"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
                      <div className="relative">
                        <input
                          required
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail Corporativo</label>
                      <div className="relative">
                        <input
                          required
                          type="email"
                          placeholder="exemplo@empresa.com.br"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-brand-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                      ) : (
                        <>Confirmar Agendamento <i className="fa-solid fa-arrow-right text-xs"></i></>
                      )}
                    </button>

                    <p className="text-[9px] text-center text-slate-400 mt-2">
                      Ao clicar em confirmar, você concorda com nossa política de privacidade.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;