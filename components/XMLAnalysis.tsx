
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Download, Loader2, Search, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { parseNFeXML, analyzeXMLProducts } from '../services/xmlService';
import { XMLAnalysisResult } from '../types';
import * as XLSX from 'xlsx';

interface XMLAnalysisProps {
    onClose?: () => void;
}

const XMLAnalysis: React.FC<XMLAnalysisProps> = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [result, setResult] = useState<XMLAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.xml')) {
            setError("Por favor, selecione um arquivo XML de NFe ou NFCe.");
            return;
        }

        try {
            setError(null);
            setIsAnalyzing(true);
            const content = await file.text();
            const initialAnalysis = await parseNFeXML(content, file.name);

            setProgress({ current: 0, total: initialAnalysis.products.length });

            const detailedAnalysis = await analyzeXMLProducts(initialAnalysis, (current, total) => {
                setProgress({ current, total });
            });

            setResult(detailedAnalysis);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao processar o XML.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const exportToExcel = () => {
        if (!result) return;

        const data = result.products.map(p => ({
            'Código XML': p.cProd,
            'Descrição': p.xProd,
            'NCM XML': p.NCM.padStart(8, '0'),
            'EAN XML': p.cEAN,
            'Qtd': p.qCom,
            'Vlr Unit': p.vUnCom,
            'Vlr Total': p.vProd,
            'Status Busca': p.status === 'found' ? `Localizado (${p.foundBy})` : 'Não Localizado',
            'CST IBS': p.taxes?.cst_ibs ?? '-',
            'cClass IBS': p.taxes?.cClass_ibs ?? '-',
            'IBS (%)': p.taxes ? (p.taxes.aliquotaFinalIbs * 100).toFixed(2) + '%' : '-',
            'CST CBS': p.taxes?.cst_cbs ?? '-',
            'cClass CBS': p.taxes?.cClass_cbs ?? '-',
            'CBS (%)': p.taxes ? (p.taxes.aliquotaFinalCbs * 100).toFixed(2) + '%' : '-',
            'IBS (R$)': p.taxes ? (p.vProd * p.taxes.aliquotaFinalIbs).toFixed(2) : '-',
            'CBS (R$)': p.taxes ? (p.vProd * p.taxes.aliquotaFinalCbs).toFixed(2) : '-',
            'Total Imposto (R$)': p.taxes ? (p.vProd * (p.taxes.aliquotaFinalIbs + p.taxes.aliquotaFinalCbs)).toFixed(2) : '-',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Análise Tributária');
        XLSX.writeFile(wb, `Analise_${result.fileName.replace('.xml', '')}.xlsx`);
    };

    const totalIBS = (result?.products || []).reduce((acc, p) => acc + (p.taxes ? p.taxes.ibs_val * p.qCom : 0), 0);
    const totalCBS = (result?.products || []).reduce((acc, p) => acc + (p.taxes ? p.taxes.cbs_val * p.qCom : 0), 0);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 border-b bg-white">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="text-brand-600" />
                            Análise em Lote (XML)
                        </h2>
                        <p className="text-slate-500">Importe arquivos NFe/NFCe para analisar a tributação de todos os produtos.</p>
                    </div>
                    {result && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setResult(null); setError(null); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Nova Importação
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                            >
                                <Download size={18} />
                                Exportar Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow p-6 overflow-hidden flex flex-col">
                {!result && !isAnalyzing ? (
                    <div
                        className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${isDragging ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-brand-400'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xml"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        />
                        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-6 text-brand-600">
                            <Upload size={40} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Arraste seu XML aqui</h3>
                        <p className="text-slate-500 text-center max-w-sm">
                            Ou clique para selecionar o arquivo no seu computador.<br />
                            Compatível com arquivos de NF-e e NFC-e.
                        </p>
                        {error && (
                            <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-brand-600 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-brand-600 font-bold">
                                {Math.round((progress.current / progress.total) * 100)}%
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Analisando Tributação...</h3>
                        <p className="text-slate-500 mb-6">
                            Consultando EAN, NCM e similaridade para {progress.total} itens.
                        </p>
                        <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden">
                            <div
                                className="bg-brand-600 h-full transition-all duration-300 ease-out"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="mt-4 text-sm text-slate-400">Item {progress.current} de {progress.total}</p>
                    </div>
                ) : result ? (
                    <div className="flex-grow flex flex-col gap-6 overflow-hidden">
                        {/* Header de Resumo do XML */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Data Emissão</p>
                                <p className="text-slate-800 font-medium">
                                    {result.date ? new Date(result.date).toLocaleDateString('pt-BR') : '-'}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Produtos</p>
                                <p className="text-slate-800 font-medium">{result.products.length} itens</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Valor Total Nota</p>
                                <p className="text-slate-800 font-bold">
                                    {result.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-brand-600">
                                <p className="text-[10px] text-brand-600 uppercase font-black mb-1">Total Aproximado IBS</p>
                                <p className="text-brand-700 font-black text-lg">
                                    {totalIBS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
                                <p className="text-[10px] text-blue-600 uppercase font-black mb-1">Total Aproximado CBS</p>
                                <p className="text-blue-700 font-black text-lg">
                                    {totalCBS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl shadow-lg border-l-4 border-l-amber-500">
                                <p className="text-[10px] text-amber-400 uppercase font-black mb-1">Total IBS + CBS</p>
                                <p className="text-white font-black text-xl">
                                    {(totalIBS + totalCBS).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>

                        {/* Tabela de Resultados */}
                        <div className="flex-grow bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Item</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">XML Dados</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">CST</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">cClass</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Alíquotas</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Valor Imposto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.products.map((p, idx) => (
                                            <tr
                                                key={idx}
                                                className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-100/60'
                                                    } hover:bg-brand-50 border-b border-slate-100`}
                                            >
                                                <td className="px-4 py-4">
                                                    <span className="text-slate-400 text-sm font-mono">{idx + 1}</span>
                                                </td>
                                                <td className="px-4 py-4 min-w-[250px]">
                                                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{p.xProd}</p>
                                                    <div className="flex gap-3 mt-1">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">EAN: {p.cEAN}</span>
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">NCM: {p.NCM}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {p.status === 'found' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                                                                <CheckCircle2 size={14} />
                                                                Localizado
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium ml-1">Encontrado por: <b className="text-slate-600">{p.foundBy}</b></span>
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 w-fit">
                                                            <XCircle size={14} />
                                                            Mapear Manual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {p.taxes ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 w-7 h-5 flex items-center justify-center rounded border border-indigo-100 shrink-0">IBS</span>
                                                                <span className="text-base font-black text-slate-800 tracking-tight">{p.taxes.cst_ibs}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black text-brand-500 bg-brand-50 w-7 h-5 flex items-center justify-center rounded border border-brand-100 shrink-0">CBS</span>
                                                                <span className="text-base font-black text-slate-800 tracking-tight">{p.taxes.cst_cbs}</span>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {p.taxes ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 w-7 h-5 flex items-center justify-center rounded border border-indigo-100 shrink-0">IBS</span>
                                                                <span className="text-sm font-bold text-slate-700 font-mono tracking-tighter">{p.taxes.cClass_ibs}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black text-brand-500 bg-brand-50 w-7 h-5 flex items-center justify-center rounded border border-brand-100 shrink-0">CBS</span>
                                                                <span className="text-sm font-bold text-slate-700 font-mono tracking-tighter">{p.taxes.cClass_cbs}</span>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {p.taxes ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between min-w-[90px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                <span className="text-[9px] font-black text-indigo-500">IBS</span>
                                                                <span className="text-sm font-black text-indigo-700">{(p.taxes.aliquotaFinalIbs * 100).toFixed(2)}%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between min-w-[90px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                <span className="text-[9px] font-black text-brand-500">CBS</span>
                                                                <span className="text-sm font-black text-brand-700">{(p.taxes.aliquotaFinalCbs * 100).toFixed(2)}%</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">Não disponível</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {p.taxes ? (
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-brand-700">
                                                                {((p.vProd * (p.taxes.aliquotaFinalIbs + p.taxes.aliquotaFinalCbs))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">sobre {p.vProd.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default XMLAnalysis;
