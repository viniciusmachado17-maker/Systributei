
import React from 'react';

const Timeline: React.FC = () => {
  const steps = [
    { year: '2026', title: 'Início do Teste', desc: 'Alíquotas de 0,1% (IBS) e 0,9% (CBS) para teste do sistema.' },
    { year: '2027', title: 'CBS Plena', desc: 'PIS/Cofins são extintos. Início da CBS e do Imposto Seletivo.' },
    { year: '2029-2032', title: 'Transição Gradual', desc: 'Extinção lenta do ICMS e ISS com aumento proporcional do IBS.' },
    { year: '2033', title: 'Sistema Novo', desc: 'Fim total da transição. Apenas IBS e CBS em vigor.' },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-16 text-balance">Cronograma da Transição</h2>
        <div className="grid md:grid-cols-4 gap-4 relative">
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 -z-0"></div>
          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold mb-6 border-4 border-white shadow-md">
                {idx + 1}
              </div>
              <h3 className="text-xl font-bold text-brand-700 mb-2">{step.year}</h3>
              <p className="font-semibold text-slate-800 text-sm mb-2">{step.title}</p>
              <p className="text-slate-500 text-xs px-4 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Timeline;
