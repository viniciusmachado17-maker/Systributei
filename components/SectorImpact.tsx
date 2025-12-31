
import React from 'react';

const SectorImpact: React.FC = () => {
  const sectors = [
    {
      name: "Indústria",
      icon: "fa-industry",
      impact: "Positivo",
      color: "text-green-600",
      bg: "bg-green-50",
      desc: "Fim da cumulatividade e desoneração total de exportações e investimentos, impulsionando a competitividade."
    },
    {
      name: "Serviços",
      icon: "fa-bell-concierge",
      impact: "Atenção",
      color: "text-amber-600",
      bg: "bg-amber-50",
      desc: "Setores com pouca cadeia de insumos podem ter aumento na alíquota nominal, exigindo planejamento."
    },
    {
      name: "Cesta Básica",
      icon: "fa-basket-shopping",
      impact: "Isenção",
      color: "text-blue-600",
      bg: "bg-blue-50",
      desc: "Itens essenciais terão alíquota zero, garantindo que o custo da alimentação não suba para o consumidor."
    }
  ];

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-block px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Análise Econômica</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">O impacto no seu setor</h2>
            <p className="text-slate-600 text-lg">Entenda como a transição do ICMS/ISS para o IBS/CBS afeta diretamente seu modelo de negócio.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {sectors.map((sector, idx) => (
            <div key={idx} className="group p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
              <div className={`w-16 h-16 ${sector.bg} ${sector.color} rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:rotate-6 transition-transform`}>
                <i className={`fa-solid ${sector.icon}`}></i>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{sector.name}</h3>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${sector.bg} ${sector.color} border border-current opacity-70`}>
                  {sector.impact}
                </span>
              </div>
              <p className="text-slate-500 leading-relaxed font-medium mb-8">{sector.desc}</p>
              
              <div className="pt-6 border-t border-slate-50">
                <button className="text-sm font-black text-brand-600 flex items-center gap-2 group/btn">
                  Explorar detalhes <i className="fa-solid fa-chevron-right text-[10px] transition-transform group-hover/btn:translate-x-1"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectorImpact;
