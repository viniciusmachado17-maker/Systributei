
import React, { useState } from 'react';

const FAQItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <button 
        className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-slate-800">{question}</span>
        <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed animate-slide-up">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQ: React.FC = () => {
  return (
    <section id="duvidas" className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Perguntas Frequentes</h2>
        <div className="space-y-4">
        <FAQItem 
            question="Para que serve o TributeiClass?" 
            answer={<p>A TributeiClass é uma plataforma que <strong>ajuda sua empresa a consultar e aplicar a tributação correta</strong> na nova lógica da Reforma Tributária, com foco em <strong>IBS e CBS</strong>, apoiando principalmente <strong>classificação de produtos/serviços</strong> e <strong>parametrização fiscal</strong> para emissão de notas fiscais.</p>} 
          />
          <FAQItem 
            question="O TributeiClass é gratuito?" 
            answer={<p>Não, mas você pode testar a plataforma por um período de 7 dias ou até atingir 5 consultas de produtos.</p>} 
          />
          <FAQItem 
            question="O que é IBS e CBS?" 
            answer={<p>São os novos impostos criados pela Reforma Tributária. O <strong>IBS</strong> (Imposto sobre Bens e Serviços) é de competência estadual e municipal, e a <strong>CBS</strong> (Contribuição sobre Bens e Serviços) é federal. Juntos, eles substituem cinco impostos antigos <strong>(ICMS, ISS, IPI, PIS, COFINS )</strong>.</p>} 
          />
          <FAQItem 
            question="Pra quem o sistema é indicadoo?" 
            answer={<p>Para empresas que emitem notas e precisam reduzir risco fiscal, como: <strong>supermercados e atacarejos, varejo em geral, distribuidoras, indústria (dependendo do escopo de cadastro) e escritórios contábeis que atendem vários CNPJs</strong>.</p>} 
          />
          <FAQItem 
            question="Como sei a alíquota do meu produto?" 
            answer={<p>A alíquota padrão será definida em lei complementar (estimada entre 26,5% e 27,5%), mas existem exceções. Com o nosso aplicativo, você não precisa decorar nada: basta escanear o produto e nós mostramos a tributação correta para seu cadastro.</p>} 
          />
          <FAQItem 
            question="O sistema substitui meu contador?" 
            answer={<p>Não. Ele <strong>não substitui contabilidade</strong> nem consultoria jurídica/tributária. Ele é uma ferramenta para <strong>agilizar consulta, padronizar classificação e apoiar decisões</strong>, reduzindo erros e retrabalho.</p>} 
          />
          <FAQItem 
            question="Quais são as informações que o TributeClass me fornece?" 
            answer={<p>A ferramenta te fornecerá as informações da <strong>reforma tributária</strong> necessárias para <strong>atualização cadastral de produtos e emissão de notas</strong>. Dentre elas estão o novo <strong>CST, cClassTrib, Alíquota IBS, Redução de IBS, Alíquota de CBS e Redução de CBS</strong>.</p>} 
          />
          <FAQItem 
            question="Como eu consulto um item?" 
            answer={<p>Você pode consultar por <strong>Código de Barras, NCM ou Nome do produto.</strong></p>} 
          />
        </div>
      </div>
    </section>
  );
};

export default FAQ;
