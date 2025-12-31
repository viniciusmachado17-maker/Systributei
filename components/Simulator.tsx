
import React, { useState, useRef, useEffect } from 'react';
import { findProduct, calculateTaxes } from '../services/taxService';
import { explainTaxRule } from '../services/geminiService';
import { Product, TaxBreakdown, SearchMode } from '../types';

const Simulator: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('barcode');
  const [product, setProduct] = useState<Product | null>(null);
  const [taxes, setTaxes] = useState<TaxBreakdown | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCashback, setUseCashback] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Efeito para ligar/desligar câmera
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isScannerActive && mode === 'barcode') {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          setIsScannerActive(false);
        }
      };
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScannerActive, mode]);

  const handleSearch = async (forcedQuery?: string) => {
    const searchQuery = forcedQuery || query;
    if (!searchQuery) return;

    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setIsScannerActive(false);

    // Simular delay de processamento para UX
    setTimeout(async () => {
      // Corrigido await para findProduct
      const found = await findProduct(searchQuery, mode);

      if (found) {
        setProduct(found);
        const calculated = calculateTaxes(found, useCashback);
        setTaxes(calculated);
        
        // Chamada automática da IA para explicar o imposto do produto encontrado
        setIsExplaining(true);
        const aiText = await explainTaxRule(found.produtos, found.category, found.ncm);
        setExplanation(aiText);
        setIsExplaining(false);
      } else {
        setProduct(null);
        setTaxes(null);
        setError("Produto não encontrado na base. Tente 'iPhone', 'Arroz' ou 'Coca'.");
      }
      setIsLoading(false);
    }, 800);
  };

  // Simular detecção de código de barras
  const captureAndScan = () => {
    setIsScannerActive(false);
    // Em um app real, aqui usaríamos uma lib como jsQR. 
    // Para demo, pegamos um produto aleatório da lista.
    handleSearch("7891991010212"); 
  };

  return (
    <section id="simulador" className="py-24 bg-[#0A0F1D] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full mb-6">
            <span className="text-brand-400 font-bold text-xs uppercase tracking-widest">Tecnologia Tributei</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 italic tracking-tighter uppercase">Calculadora Digital</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Compare em tempo real o impacto da reforma no seu bolso.</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-4 md:p-12 shadow-2xl">
          
          {/* Alternância de Modo */}
          <div className="flex flex-wrap gap-3 mb-10 justify-center">
            {(['barcode', 'name', 'ncm'] as SearchMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setIsScannerActive(false); }}
                className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${mode === m ? 'bg-brand-600 text-white shadow-lg scale-105' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                {m === 'barcode' ? (
                   <><i className="fa-solid fa-camera mr-2"></i> Escanear</>
                ) : m === 'name' ? 'Por Nome' : 'Por NCM'}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="relative flex-grow group">
              {mode === 'barcode' && !isScannerActive ? (
                <button 
                  onClick={() => setIsScannerActive(true)}
                  className="w-full pl-6 pr-6 py-6 rounded-3xl bg-brand-600/20 border-2 border-dashed border-brand-600/40 text-brand-400 font-bold text-lg hover:bg-brand-600/30 transition flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-expand"></i> ABRIR SCANNER DE CÂMERA
                </button>
              ) : isScannerActive ? (
                <div className="relative w-full aspect-video md:aspect-auto md:h-[68px] overflow-hidden rounded-3xl border-2 border-brand-500 bg-black">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
                   <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none"></div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-0.5 bg-brand-500 shadow-[0_0_15px_#3b82f6] animate-pulse"></div>
                   <button 
                    onClick={captureAndScan}
                    className="absolute bottom-2 right-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                   >
                     FOCAR & CAPTURAR
                   </button>
                </div>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition"></i>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={mode === 'name' ? "Ex: 'iPhone', 'Arroz'..." : mode === 'ncm' ? "Digite os 8 dígitos do NCM" : "Digite o código de barras"}
                    className="w-full pl-16 pr-6 py-6 rounded-3xl bg-white/5 border border-white/10 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white/10 transition-all text-lg font-medium"
                  />
                </>
              )}
            </div>
            
            {!isScannerActive && (
              <button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="bg-brand-600 hover:bg-brand-700 text-white px-12 py-6 rounded-3xl font-black transition-all transform active:scale-95 shadow-xl hover:shadow-brand-600/20 text-lg flex items-center justify-center min-w-[180px]"
              >
                {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'SIMULAR'}
              </button>
            )}
          </div>

          {/* Toggle Cashback */}
          <div className="flex items-center justify-center gap-4 mb-12">
             <span className={`text-sm font-bold ${!useCashback ? 'text-white' : 'text-slate-500'}`}>Padrão</span>
             <button 
               onClick={() => {
                 setUseCashback(!useCashback);
                 if (product) handleSearch(product.ean); // Recalcula se já tiver produto (corrigido barcode -> ean)
               }}
               className={`w-14 h-8 rounded-full relative transition-colors ${useCashback ? 'bg-accent-500' : 'bg-slate-700'}`}
             >
               <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${useCashback ? 'left-7' : 'left-1'}`}></div>
             </button>
             <span className={`text-sm font-bold ${useCashback ? 'text-accent-500' : 'text-slate-500'}`}>Com Cashback (Baixa Renda)</span>
          </div>

          {error && <p className="text-red-400 text-center mb-8 bg-red-400/10 py-3 rounded-xl border border-red-400/20">{error}</p>}

          {product && taxes && !isLoading && (
            <div className="animate-slide-up grid lg:grid-cols-5 gap-8 items-start">
              
              {/* Card Principal do Produto */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-[3rem] p-8 text-slate-900 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                      <div>
                        <h3 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">{product.produtos}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-brand-600/10 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Novo Regime</span>
                          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">NCM {product.ncm}</span>
                          {taxes.isCestaBasica && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Cesta Básica</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">Preço Final Estimado</span>
                        <span className="text-4xl font-black text-brand-600 tracking-tighter">
                          {(product.price + taxes.totalNovo - taxes.cashbackEstimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">I</div>
                          <span className="font-bold text-slate-600 text-sm">IBS ({(taxes.aliquotaIbs * 100).toFixed(1)}%)</span>
                        </div>
                        <p className="font-black text-xl text-slate-900">{taxes.ibs_val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-accent-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">C</div>
                          <span className="font-bold text-slate-600 text-sm">CBS ({(taxes.aliquotaCbs * 100).toFixed(1)}%)</span>
                        </div>
                        <p className="font-black text-xl text-slate-900">{taxes.cbs_val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>

                    {useCashback && taxes.cashbackEstimado ? (
                      <div className="mb-8 p-5 bg-accent-50 border-2 border-dashed border-accent-500/30 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-accent-500/20">
                            <i className="fa-solid fa-hand-holding-dollar"></i>
                          </div>
                          <div>
                            <span className="block text-[10px] font-black text-accent-600 uppercase">Cashback Reembolsado</span>
                            <span className="font-black text-accent-700">O governo te devolve:</span>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-accent-600">-{taxes.cashbackEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ) : null}

                    <div className="mt-6 p-6 bg-blue-50/50 border-l-4 border-brand-600 rounded-r-2xl">
                       <div className="flex items-center gap-2 mb-3">
                          <i className="fa-solid fa-wand-magic-sparkles text-brand-600"></i>
                          <p className="font-black text-brand-600 uppercase text-[10px] tracking-widest">Insight Tributário IA</p>
                       </div>
                       {isExplaining ? (
                         <div className="flex items-center gap-3 text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                            <span className="text-xs font-medium">Analisando leis complementares...</span>
                         </div>
                       ) : (
                         <p className="text-slate-800 text-sm leading-relaxed font-medium">
                           {explanation}
                         </p>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Lateral: Comparativo */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 text-white">
                  <h4 className="font-black text-xl mb-8 italic tracking-tight uppercase">Carga Tributária</h4>
                  
                  <div className="space-y-10">
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest text-slate-500">
                        <span>Regime Atual (ICMS/PIS/COFINS)</span>
                        <span className="text-slate-300 font-bold">{taxes.totalAntigo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-slate-700 w-full rounded-full"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest text-brand-400">
                        <span>Novo Regime (IBS/CBS)</span>
                        <span className="text-brand-400 font-bold">{taxes.totalNovo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-1000 rounded-full ${taxes.diferencaPercentual < 0 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-brand-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]'}`} 
                          style={{ width: `${Math.min(100, (taxes.totalNovo / taxes.totalAntigo) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className={`p-8 rounded-[2rem] text-center transform hover:scale-105 transition duration-500 ${taxes.diferencaPercentual < 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-brand-500/10 border border-brand-500/20'}`}>
                      <span className="block text-[10px] font-black uppercase mb-2 opacity-60 tracking-[0.2em]">Impacto Estimado</span>
                      <span className={`text-5xl font-black tracking-tighter ${taxes.diferencaPercentual < 0 ? 'text-green-400' : 'text-brand-400'}`}>
                        {taxes.diferencaPercentual > 0 ? '+' : ''}{taxes.diferencaPercentual.toFixed(1)}%
                      </span>
                      <p className="text-[10px] mt-4 opacity-40 font-bold leading-tight">
                        Cálculo baseado na transição plena (2033) conforme as diretrizes do Ministério da Fazenda.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] flex items-center gap-4">
                   <div className="w-12 h-12 bg-yellow-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xl shadow-lg shadow-yellow-500/20">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                   </div>
                   <p className="text-yellow-200 text-[11px] font-bold leading-tight">
                     DADOS PRELIMINARES: Estas alíquotas são projeções médias. Os valores podem variar conforme regulamentação de cada estado e município.
                   </p>
                </div>
              </div>

            </div>
          )}

          {!product && !isLoading && !isScannerActive && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-600 opacity-40">
               <i className="fa-solid fa-barcode text-6xl mb-4"></i>
               <p className="font-bold">Aguardando entrada de dados para simular...</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Simulator;