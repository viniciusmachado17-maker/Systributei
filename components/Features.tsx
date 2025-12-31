
import React from 'react';

const Features: React.FC = () => {
  return (
    <section id="como-funciona" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Por que usar a TributeiClass?</h2>
          <p className="text-slate-600">A reforma tributária unificou 5 impostos em apenas dois (IBS e CBS). Parece simples, mas na prática é uma transição complexa. Nós da TributeiClass resolvemos isso para você, faça já seu cadastro e consulte de forma simples e segura a nova tributação de IBS e CBS!</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition duration-300 group">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-brand-600 text-2xl mb-6 group-hover:scale-110 transition">
              <i className="fa-solid fa-barcode"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Leitura Inteligente</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              É só apontar a câmera ou digitar o código. Nossa base de dados identifica automaticamente as novas alíquotas baseadas no NCM e regras vigentes.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition duration-300 group">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-accent-500 text-2xl mb-6 group-hover:scale-110 transition">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">IA Tributária</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Dúvida sobre um item de luxo ou cesta básica? Nossa IA explica o motivo da tributação em linguagem simples, direto no aplicativo.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition duration-300 group">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-2xl mb-6 group-hover:scale-110 transition">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Detalhamento Transparente</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Entenda a composição do preço. Veja separadamente o valor do IBS e da CBS para saber quanto vai para cada ente federativo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
