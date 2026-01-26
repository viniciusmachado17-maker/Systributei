
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getProductDetails } from '../services/taxService';
import { calculateTaxes } from '../services/taxService';
import { reportMissingProduct, supabase } from '../services/supabaseClient';
import { UserProfile } from '../App';

interface SpreadsheetAnalysisProps {
    user: UserProfile | null;
    status: 'idle' | 'processing' | 'completed' | 'error' | 'awaiting_payment';
    progress: { current: number; total: number };
    result: any[] | null;
    error: string | null;
    onCheckout: (rowCount: number, filename: string, storagePath: string, eanKey: string, nameKey: string) => Promise<void>;
    onReset: () => void;
    onDownload: () => Promise<void>;
}

const SpreadsheetAnalysis: React.FC<SpreadsheetAnalysisProps> = ({
    user, status, progress, result, error, onCheckout, onReset, onDownload
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingFile, setPendingFile] = useState<{
        data: any[],
        rowCount: number,
        filename: string,
        eanKey: string,
        nameKey: string,
        price: number
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
        const validExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            alert("Por favor, selecione uma planilha Excel (.xlsx ou .xls).");
            return;
        }

        try {
            setUploading(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const data = new Uint8Array(arrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const sheetData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as any[];

                    if (sheetData.length === 0) throw new Error("A planilha está vazia.");

                    const firstRow = sheetData[0];
                    const originalKeys = Object.keys(firstRow);
                    const normalizeKey = (k: string) => k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

                    const eanKey = originalKeys.find(key => {
                        const nk = normalizeKey(key);
                        return ['EAN', 'CODIGOBARRAS', 'GTIN', 'CODIGO'].includes(nk) || nk.includes('BARRA');
                    });

                    const produtoKey = originalKeys.find(key => {
                        const nk = normalizeKey(key);
                        return ['PRODUTO', 'NOME', 'DESCRICAO', 'DESC'].includes(nk) || nk.includes('PROD');
                    });

                    if (!eanKey || !produtoKey) {
                        throw new Error(`Colunas obrigatórias não encontradas: EAN e PRODUTO.`);
                    }

                    // Calcular Preço Tiered
                    const rowCount = sheetData.length;
                    let estimatedPrice = 0;
                    if (rowCount <= 1500) {
                        estimatedPrice = 450;
                    } else if (rowCount <= 10000) {
                        estimatedPrice = rowCount * 0.25;
                    } else if (rowCount <= 15000) {
                        estimatedPrice = rowCount * 0.21;
                    } else {
                        estimatedPrice = rowCount * 0.19;
                    }

                    // Subir para o Storage antes do pagamento (fica lá temporário associado ao user)
                    const storagePath = `${user?.id}/${Date.now()}_${file.name}`;
                    const { error: uploadErr } = await supabase.storage
                        .from('spreadsheets')
                        .upload(storagePath, file);

                    if (uploadErr) throw uploadErr;

                    setPendingFile({
                        data: sheetData,
                        rowCount,
                        filename: file.name,
                        eanKey,
                        nameKey: produtoKey,
                        price: estimatedPrice,
                        storagePath
                    } as any);

                } catch (err: any) {
                    alert(err.message);
                } finally {
                    setUploading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err: any) {
            console.error(err);
            alert("Erro ao ler o arquivo.");
            setUploading(false);
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

        const ws = XLSX.utils.json_to_sheet(result);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TributeiClass_Result');
        XLSX.writeFile(wb, `Resultado_Classificacao_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 border-b bg-white">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="text-brand-600" />
                            Classificação por Planilha
                        </h2>
                        <p className="text-slate-500">Suba uma lista de EANs para preenchimento automático de dados tributários.</p>
                    </div>
                    {result && (
                        <div className="flex gap-3">
                            <button
                                onClick={onReset}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Nova Importação
                            </button>
                            <button
                                onClick={onDownload}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                            >
                                <Download size={18} />
                                Baixar Resultado
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow p-6 overflow-hidden flex flex-col">
                {status === 'idle' ? (
                    <div
                        className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${isDragging ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-brand-400'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
                        onClick={() => !pendingFile && fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        />

                        {uploading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                                <p className="text-slate-500 font-bold">Lendo planilha...</p>
                            </div>
                        ) : pendingFile ? (
                            <div className="flex flex-col items-center text-center animate-fade-in p-8 bg-slate-50 rounded-3xl border border-slate-200">
                                <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{pendingFile.filename}</h3>
                                <p className="text-slate-500 mb-6 font-medium">Contém <b>{pendingFile.rowCount}</b> produtos identificados.</p>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 w-full max-w-sm">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Valor da Classificação</p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-lg font-bold text-slate-400">R$</span>
                                        <span className="text-5xl font-black text-slate-800">{pendingFile.price.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-4 leading-relaxed italic">
                                        Processamento profissional em Cloud.<br />
                                        Inclui todas as alíquotas futuras da Reforma Tributária.
                                    </p>
                                </div>

                                <div className="flex gap-4 w-full justify-center">
                                    <button
                                        onClick={() => setPendingFile(null)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition uppercase text-xs"
                                    >
                                        Trocar Arquivo
                                    </button>
                                    <button
                                        onClick={() => onCheckout(pendingFile.rowCount, pendingFile.filename, (pendingFile as any).storagePath, pendingFile.eanKey, pendingFile.nameKey)}
                                        className="px-10 py-4 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-700 transition transform active:scale-95 shadow-xl shadow-brand-500/20 uppercase tracking-widest text-xs flex items-center gap-2"
                                    >
                                        Pagar e Processar
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-6 text-brand-600">
                                    <Upload size={40} />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Arraste sua planilha aqui</h3>
                                <p className="text-slate-500 text-center max-w-sm">
                                    Sua planilha deve conter obrigatoriamente as colunas:<br />
                                    <b className="text-brand-600">EAN</b> (Código de barras) e <b className="text-brand-600">PRODUTO</b> (Nome do item).<br />
                                    <small className="text-slate-400 mt-2 block font-normal italic">Formatos aceitos: .xlsx, .xls</small>
                                </p>
                            </>
                        )}

                        {error && !pendingFile && (
                            <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                    </div>
                ) : status === 'awaiting_payment' ? (
                    <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <i className="fa-solid fa-credit-card text-4xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Aguardando Pagamento</h3>
                        <p className="text-slate-500 max-w-md mb-8">
                            Identificamos um pedido de classificação pendente. O processamento iniciará automaticamente assim que o pagamento for confirmado.
                        </p>
                        <button
                            onClick={onReset}
                            className="text-slate-400 font-bold hover:text-red-500 transition uppercase text-xs tracking-widest"
                        >
                            Cancelar Pedido e Enviar Novo
                        </button>
                    </div>
                ) : status === 'processing' ? (
                    <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-6" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Processando Planilha...</h3>
                        <p className="text-slate-500 mb-6">
                            Buscando dados tributários. Você pode navegar em outras telas enquanto trabalhamos.
                        </p>
                        <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden">
                            <div
                                className="bg-brand-600 h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress.current}%` }}
                            ></div>
                        </div>
                        <p className="mt-4 text-sm text-slate-400">{progress.current}% concluído</p>
                    </div>
                ) : status === 'completed' ? (
                    <div className="flex-grow flex flex-col items-center justify-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Processamento Concluído!</h4>
                            <p className="text-slate-500 mt-2">Sua planilha já está pronta com todas as alíquotas da Reforma Tributária.</p>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={onReset}
                                className="px-6 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-xl transition uppercase text-xs"
                            >
                                Iniciar Nova
                            </button>
                            <button
                                onClick={onDownload}
                                className="flex items-center gap-3 px-10 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs"
                            >
                                <i className="fa-solid fa-download mr-1"></i>
                                Baixar Resultado Final
                            </button>
                        </div>
                    </div>
                ) : status === 'error' ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <XCircle size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Erro no Processamento</h3>
                        <p className="text-slate-500 mb-8 max-w-sm">{error || "Ocorreu um erro inesperado ao processar sua planilha."}</p>
                        <button onClick={onReset} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition">
                            Tentar Novamente
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default SpreadsheetAnalysis;
