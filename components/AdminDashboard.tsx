import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
    onNavigate: (view: any) => void;
}

const ProductManager: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formTab, setFormTab] = useState<'info' | 'cbs' | 'ibs'>('info');

    const [formData, setFormData] = useState({
        // Info base
        produto: '',
        ean: '',
        ncm: '',
        cest: '',

        // CBS fields
        cbs: {
            cst_entrada: '01',
            cst_saida: '01',
            cclass_entrada: '01',
            cclass_saida: '01',
            alq_ent: '0',
            alq_sai: '0',
            red_alq_ent: '0',
            red_alq_sai: '0',
            alqf_ent: '0',
            alqf_sai: '0'
        },

        // IBS fields
        ibs: {
            cst_entrada: '01',
            cst_saida: '01',
            cclass_entrada: '01',
            cclass_saida: '01',
            alqe_ent: '0',
            alqe_sai: '0',
            red_alqe_ent: '0',
            red_alqe_sai: '0',
            alqfe_ent: '0',
            alqfe_sai: '0',
            alqm_ent: '0',
            alqm_sai: '0',
            red_alqm_ent: '0',
            red_alqm_sai: '0',
            alqfm_ent: '0',
            alqfm_sai: '0'
        }
    });

    // --- Auxiliares de Formatação ---
    const maskNCM = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 4) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
        return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
    };

    const maskCEST = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 7);
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    };

    const maskCST = (val: string) => val.replace(/\D/g, '').slice(0, 3);
    const maskCClass = (val: string) => val.replace(/\D/g, '').slice(0, 10);

    const handleRateBlur = (field: 'cbs' | 'ibs', subField: string) => {
        setFormData(prev => {
            const currentVal = (prev as any)[field][subField];
            if (!currentVal) return prev;

            let numeric = currentVal.replace(/[^\d.]/g, '');
            if (numeric === '' || isNaN(parseFloat(numeric))) return prev;

            const formatted = `${parseFloat(numeric).toFixed(2)}%`;
            return {
                ...prev,
                [field]: {
                    ...(prev as any)[field],
                    [subField]: formatted
                }
            };
        });
    };

    useEffect(() => {
        fetchRecentProducts();
    }, []);

    const fetchRecentProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.error("Error fetching products:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            // 1. Definição do EAN (Manual ou Automático baseado no nome)
            let finalEan = formData.ean.trim();
            if (!finalEan) {
                // Remove espaços e caracteres especiais, limita a 20 chars e põe em caixa alta
                finalEan = formData.produto
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
                    .replace(/[^a-zA-Z0-9]/g, '') // Apenas alfanuméricos
                    .slice(0, 20)
                    .toUpperCase();

                // Se ainda estiver vazio (ex: nome só de emojis/símbolos), usa um timestamp
                if (!finalEan) {
                    finalEan = `INT${Date.now().toString().slice(-8)}`;
                }
            }

            // 2. Validations
            const { data: existingEan } = await supabase
                .from('products')
                .select('id')
                .eq('ean', finalEan)
                .maybeSingle();

            if (existingEan) {
                if (formData.ean) {
                    throw new Error("Já existe um produto com este EAN.");
                } else {
                    // Se foi o gerado automaticamente, tenta um sufixo para desempate
                    finalEan = `${finalEan}${Math.floor(Math.random() * 1000)}`;
                }
            }

            // Apenas para garantir que não mandamos o mesmo nome se o EAN for gerado
            if (!formData.ean) {
                const { data: existingName } = await supabase
                    .from('products')
                    .select('id')
                    .ilike('produto', formData.produto)
                    .maybeSingle();

                if (existingName) throw new Error("Já existe um produto com este nome.");
            }

            // 3. Insert Product Base
            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert([{
                    produto: formData.produto,
                    ean: finalEan,
                    ncm: formData.ncm,
                    cest: formData.cest || null,
                    status: 'active'
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 3. Insert CBS Data
            const { error: cbsError } = await supabase
                .from('cbs')
                .insert([{
                    product_id: newProduct.id,
                    ...formData.cbs
                }]);

            if (cbsError) throw cbsError;

            // 4. Insert IBS Data
            const { error: ibsError } = await supabase
                .from('ibs')
                .insert([{
                    product_id: newProduct.id,
                    ...formData.ibs
                }]);

            if (ibsError) throw ibsError;

            alert("Produto e dados tributários cadastrados com sucesso!");

            // Reset form
            setFormData({
                produto: '', ean: '', ncm: '', cest: '',
                cbs: { cst_entrada: '01', cst_saida: '01', cclass_entrada: '01', cclass_saida: '01', alq_ent: '0', alq_sai: '0', red_alq_ent: '0', red_alq_sai: '0', alqf_ent: '0', alqf_sai: '0' },
                ibs: { cst_entrada: '01', cst_saida: '01', cclass_entrada: '01', cclass_saida: '01', alqe_ent: '0', alqe_sai: '0', red_alqe_ent: '0', red_alqe_sai: '0', alqfe_ent: '0', alqfe_sai: '0', alqm_ent: '0', alqm_sai: '0', red_alqm_ent: '0', red_alqm_sai: '0', alqfm_ent: '0', alqfm_sai: '0' }
            });
            setShowForm(false);
            setFormTab('info');
            fetchRecentProducts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Gestão de Produtos</h2>
                    <p className="text-slate-500 font-medium text-sm">Adicione ou visualize itens na base tributária</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition transform active:scale-[0.98] flex items-center gap-2 text-xs uppercase tracking-wider"
                >
                    <i className="fa-solid fa-plus text-sm"></i>
                    Cadastrar Produto
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400 font-medium">Carregando produtos recentes...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-clock-rotate-left text-brand-500"></i>
                            Últimos Cadastros
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-400 font-black uppercase bg-slate-50 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">EAN</th>
                                    <th className="px-6 py-4">NCM</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800">{p.produto}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{p.ean || '---'}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{p.ncm}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded">Ativo</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">
                                            {new Date(p.created_at || p.updated_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL CADASTRO PRODUTO COMPLETO */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-slide-up overflow-hidden">

                        {/* Header Modal */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center text-lg shadow-lg shadow-brand-500/20">
                                    <i className="fa-solid fa-box-open"></i>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Cadastro de Produto e Tributação</h3>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition p-2">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>

                        {/* Tabs Internas do Form */}
                        <div className="flex border-b border-slate-100 px-6 bg-white shrink-0">
                            <button
                                onClick={() => setFormTab('info')}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${formTab === 'info' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                01. Informações Base
                            </button>
                            <button
                                onClick={() => setFormTab('cbs')}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${formTab === 'cbs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                02. Tributação CBS (Federal)
                            </button>
                            <button
                                onClick={() => setFormTab('ibs')}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${formTab === 'ibs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                03. Tributação IBS (Est./Mun.)
                            </button>
                        </div>

                        {/* Conteúdo Form */}
                        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-shake">
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                    <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
                                </div>
                            )}

                            {/* TAB 01: INFO BASE */}
                            {formTab === 'info' && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Descrição Comercial*</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Ex: ARROZ INTEGRAL TIO JOÃO 1KG"
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-slate-700 text-sm"
                                                value={formData.produto}
                                                onChange={(e) => setFormData({ ...formData, produto: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Cód. Barras (EAN13)</label>
                                            <input
                                                type="text"
                                                placeholder="789..."
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-slate-700 text-sm"
                                                value={formData.ean}
                                                onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">NCM*</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="0000.00.00"
                                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-slate-700 text-sm text-center"
                                                    value={formData.ncm}
                                                    onChange={(e) => setFormData({ ...formData, ncm: maskNCM(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">CEST</label>
                                                <input
                                                    type="text"
                                                    placeholder="00.000.00"
                                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-slate-700 text-sm text-center"
                                                    value={formData.cest}
                                                    onChange={(e) => setFormData({ ...formData, cest: maskCEST(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100/50 flex items-start gap-3">
                                        <i className="fa-solid fa-circle-info text-brand-600 mt-1"></i>
                                        <p className="text-[10px] text-brand-700 font-medium leading-relaxed">
                                            O NCM é obrigatório para todas as buscas. Se não houver EAN, o sistema utilizará a Descrição Comercial para validação de duplicidade.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TAB 02: CBS */}
                            {formTab === 'cbs' && (
                                <div className="animate-fade-in space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5 col-span-1">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">CST Entrada</label>
                                            <input type="text" placeholder="000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.cbs.cst_entrada} onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, cst_entrada: maskCST(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5 col-span-1">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">CST Saída</label>
                                            <input type="text" placeholder="000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.cbs.cst_saida} onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, cst_saida: maskCST(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5 col-span-1">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">C.Class Ent.</label>
                                            <input type="text" placeholder="00000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.cbs.cclass_entrada} onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, cclass_entrada: maskCClass(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5 col-span-1">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">C.Class Sai.</label>
                                            <input type="text" placeholder="00000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.cbs.cclass_saida} onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, cclass_saida: maskCClass(e.target.value) } })} />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
                                            Alíquotas e Reduções (CBS)
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alíquota Sai. (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold shadow-sm"
                                                    value={formData.cbs.alq_sai}
                                                    onBlur={() => handleRateBlur('cbs', 'alq_sai')}
                                                    onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, alq_sai: e.target.value } })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Redução Sai. (%)</label>
                                                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold shadow-sm outline-none"
                                                    value={formData.cbs.red_alq_sai} onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, red_alq_sai: e.target.value } })}>
                                                    <option value="0%">0%</option>
                                                    <option value="30%">30%</option>
                                                    <option value="40%">40%</option>
                                                    <option value="50%">50%</option>
                                                    <option value="60%">60%</option>
                                                    <option value="70%">70%</option>
                                                    <option value="80%">80%</option>
                                                    <option value="100%">100%</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alíq. Final Sai. (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-brand-700 text-center"
                                                    value={formData.cbs.alqf_sai}
                                                    onBlur={() => handleRateBlur('cbs', 'alqf_sai')}
                                                    onChange={(e) => setFormData({ ...formData, cbs: { ...formData.cbs, alqf_sai: e.target.value } })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 03: IBS */}
                            {formTab === 'ibs' && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">CST Entrada</label>
                                            <input type="text" placeholder="000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.ibs.cst_entrada} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, cst_entrada: maskCST(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">CST Saída</label>
                                            <input type="text" placeholder="000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.ibs.cst_saida} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, cst_saida: maskCST(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">C.Class Ent.</label>
                                            <input type="text" placeholder="00000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.ibs.cclass_entrada} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, cclass_entrada: maskCClass(e.target.value) } })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">C.Class Sai.</label>
                                            <input type="text" placeholder="00000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-center"
                                                value={formData.ibs.cclass_saida} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, cclass_saida: maskCClass(e.target.value) } })} />
                                        </div>
                                    </div>

                                    {/* Estadual */}
                                    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <i className="fa-solid fa-map"></i>
                                            Componente Estadual (IBS-E)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Alíquota E (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold"
                                                    value={formData.ibs.alqe_sai}
                                                    onBlur={() => handleRateBlur('ibs', 'alqe_sai')}
                                                    onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, alqe_sai: e.target.value } })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Redução E (%)</label>
                                                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none"
                                                    value={formData.ibs.red_alqe_sai} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, red_alqe_sai: e.target.value } })}>
                                                    <option value="0%">0%</option>
                                                    <option value="30%">30%</option>
                                                    <option value="40%">40%</option>
                                                    <option value="50%">50%</option>
                                                    <option value="60%">60%</option>
                                                    <option value="70%">70%</option>
                                                    <option value="80%">80%</option>
                                                    <option value="100%">100%</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Alíq. F. Estadual (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-brand-700 text-center"
                                                    value={formData.ibs.alqfe_sai}
                                                    onBlur={() => handleRateBlur('ibs', 'alqfe_sai')}
                                                    onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, alqfe_sai: e.target.value } })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Municipal */}
                                    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <i className="fa-solid fa-city"></i>
                                            Componente Municipal (IBS-M)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Alíquota M (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold"
                                                    value={formData.ibs.alqm_sai}
                                                    onBlur={() => handleRateBlur('ibs', 'alqm_sai')}
                                                    onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, alqm_sai: e.target.value } })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Redução M (%)</label>
                                                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none"
                                                    value={formData.ibs.red_alqm_sai} onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, red_alqm_sai: e.target.value } })}>
                                                    <option value="0%">0%</option>
                                                    <option value="30%">30%</option>
                                                    <option value="40%">40%</option>
                                                    <option value="50%">50%</option>
                                                    <option value="60%">60%</option>
                                                    <option value="70%">70%</option>
                                                    <option value="80%">80%</option>
                                                    <option value="100%">100%</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Alíq. F. Municipal (%)</label>
                                                <input type="text" placeholder="0.00%" className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-brand-700 text-center"
                                                    value={formData.ibs.alqfm_sai}
                                                    onBlur={() => handleRateBlur('ibs', 'alqfm_sai')}
                                                    onChange={(e) => setFormData({ ...formData, ibs: { ...formData.ibs, alqfm_sai: e.target.value } })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Footer Modal Action */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition text-xs uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            {formTab === 'info' && (
                                <button type="button" onClick={() => setFormTab('cbs')} className="px-8 py-3 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-700 transition text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20">
                                    Próximo: CBS
                                </button>
                            )}
                            {formTab === 'cbs' && (
                                <button type="button" onClick={() => setFormTab('ibs')} className="px-8 py-3 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-700 transition text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20">
                                    Próximo: IBS
                                </button>
                            )}
                            {formTab === 'ibs' && (
                                <button
                                    type="button"
                                    onClick={handleSaveProduct}
                                    disabled={isSaving}
                                    className="px-10 py-3 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-700 transition text-xs uppercase tracking-widest shadow-xl shadow-brand-500/30 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Finalizar e Salvar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [selectedOrg, setSelectedOrg] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'plan' | 'member' | null>(null);
    const [currentTab, setCurrentTab] = useState<'subscribers' | 'products'>('subscribers');

    // Form States
    const [newPlan, setNewPlan] = useState('start');
    const [newBillingDate, setNewBillingDate] = useState('');
    const [billingDay, setBillingDay] = useState<number | ''>('');
    const [memberEmail, setMemberEmail] = useState('');
    const [hasCommitment, setHasCommitment] = useState(false);

    const statusMap: Record<string, string> = {
        'active': 'Ativo',
        'past_due': 'Pagamento Pendente',
        'unpaid': 'Não Pago',
        'canceled': 'Cancelado',
        'incomplete': 'Incompleto',
        'incomplete_expired': 'Expirado',
        'trialing': 'Em Teste (Trial)',
        'paused': 'Pausado',
        'gratis': 'Grátis da Casa'
    };

    const statusColors: Record<string, string> = {
        'active': 'bg-emerald-100 text-emerald-700',
        'trialing': 'bg-blue-100 text-blue-700',
        'past_due': 'bg-orange-100 text-orange-700',
        'unpaid': 'bg-red-100 text-red-700',
        'canceled': 'bg-slate-100 text-slate-500',
        'gratis': 'bg-slate-100 text-slate-600'
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('admin-actions', {
                body: { action: 'list_subscribers', payload: {} }
            });

            if (error) throw error;

            setSubscribers(data);
        } catch (error: any) {
            console.error("Admin Load Error:", error);
            const msg = error.context?.json ? JSON.stringify(error) : error.message;
            alert(`Erro ao carregar painel admin: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async () => {
        setActionLoading(true);

        // Mapeamento de Planos para Preços (Stripe Price IDs)
        const priceMap: Record<string, string> = {
            'gratis': '',
            'start': 'price_1SjRiwFkPBkTRBNfsjxZBscY',
            'pro': 'price_1SjmRKFkPBkTRBNflIqVvWzE',
            'premium': 'price_1SjmT9FkPBkTRBNfuN3mH65n'
        };

        try {
            const { error } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'update_plan',
                    payload: {
                        orgId: selectedOrg.id,
                        newPlanType: newPlan,
                        newPriceId: priceMap[newPlan],
                        newBillingDate: newBillingDate,
                        billingDay: billingDay,
                        hasCommitment: hasCommitment
                    }
                }
            });

            if (error) throw error;

            alert("Plano atualizado com sucesso!");
            setModalMode(null);
            fetchSubscribers();
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddMember = async () => {
        setActionLoading(true);

        try {
            const { error } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'add_member',
                    payload: {
                        orgId: selectedOrg.id,
                        email: memberEmail
                    }
                }
            });

            if (error) throw error;

            alert("Usuário adicionado à organização!");
            setModalMode(null);
            setMemberEmail('');
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 pt-12 text-center text-slate-500">Carregando painel administrativo...</div>;

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Painel Administrativo</h1>
                        <p className="text-slate-500 font-medium">Gerencie assinaturas e banco de dados</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex mr-4">
                            <button
                                onClick={() => setCurrentTab('subscribers')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider ${currentTab === 'subscribers' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Assinantes
                            </button>
                            <button
                                onClick={() => setCurrentTab('products')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider ${currentTab === 'products' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Produtos
                            </button>
                        </div>
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs shadow-sm transition flex items-center gap-2 uppercase tracking-wide"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Voltar ao App
                        </button>
                    </div>
                </div>

                {currentTab === 'subscribers' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-400 font-black uppercase bg-slate-50 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Organização</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Dono (Email)</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Plano</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Carência</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Status</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs">Vencimento</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs text-center">Dia</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs text-center">Membros</th>
                                        <th className="px-6 py-4 whitespace-nowrap text-[10px] md:text-xs text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subscribers.map((org) => {
                                        const owner = org.profiles?.[0]; // Assumindo relação
                                        const statusKey = org.subscription_status || 'gratis';
                                        return (
                                            <tr key={org.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">{org.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{owner?.email || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${org.plan_type === 'premium' ? 'bg-purple-100 text-purple-700' :
                                                        org.plan_type === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                                                            org.plan_type === 'enterprise' ? 'bg-slate-800 text-white' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {org.plan_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${org.has_commitment ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}
                                                    `}>
                                                        {org.has_commitment ? '12 Meses' : 'Mensal'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${statusColors[statusKey] || 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {statusMap[statusKey] || statusKey}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-xs text-slate-600 whitespace-nowrap">
                                                    {org.current_period_end
                                                        ? new Date(org.current_period_end).toLocaleDateString('pt-BR')
                                                        : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-center text-indigo-600 font-bold whitespace-nowrap">
                                                    {org.billing_day ? org.billing_day : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-center whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-md ${(org.profiles?.length || 0) > (org.max_users || 1) ? 'bg-red-100 text-red-600 font-bold' : 'text-slate-600'
                                                        }`}>
                                                        {org.profiles?.length || 0} <span className="text-slate-400">/</span> {org.max_users || 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrg(org);
                                                            setNewPlan(org.plan_type);
                                                            setNewBillingDate(org.current_period_end ? new Date(org.current_period_end).toISOString().split('T')[0] : '');
                                                            setBillingDay(org.billing_day || '');
                                                            setHasCommitment(!!org.has_commitment);
                                                            setModalMode('plan');
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] bg-indigo-50 px-2 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                                                    >
                                                        Mudar Plano
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedOrg(org); setModalMode('member'); }}
                                                        disabled={!['premium', 'enterprise'].includes(org.plan_type)}
                                                        title={!['premium', 'enterprise'].includes(org.plan_type) ? "Disponível apenas no Premium" : "Adicionar Membro"}
                                                        className={`font-bold text-[10px] px-2 py-1.5 rounded-lg transition ${['premium', 'enterprise'].includes(org.plan_type)
                                                            ? "text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200"
                                                            : "text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                                                            }`}
                                                    >
                                                        + Membro
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <ProductManager />
                )}
            </div>

            {/* MODAL MUDAR PLANO */}
            {
                modalMode === 'plan' && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative animate-slide-up">
                            <button onClick={() => setModalMode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Alterar Plano</h3>
                            <p className="text-sm text-slate-500 mb-6 font-medium">Isso atualizará o plano no Stripe e os limites no Banco.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 ml-1">Novo Plano</label>
                                    <select
                                        value={newPlan}
                                        onChange={(e) => setNewPlan(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700"
                                    >
                                        <option value="gratis">Gratis</option>
                                        <option value="start">Start</option>
                                        <option value="pro">Pro</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 ml-1">Vencimento Atual</label>
                                        <input
                                            type="date"
                                            value={newBillingDate}
                                            onChange={(e) => setNewBillingDate(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 ml-1">Dia Faturamento</label>
                                        <select
                                            value={billingDay}
                                            onChange={(e) => setBillingDay(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700"
                                        >
                                            <option value="">Nenhum</option>
                                            {[1, 2, 3, 4, 5].map(d => (
                                                <option key={d} value={d}>Todo dia {d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                                        <input
                                            type="checkbox"
                                            checked={hasCommitment}
                                            onChange={(e) => setHasCommitment(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase">Possui Carência</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Aplica regra de 12 meses (bloqueia downgrade automático)</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setModalMode(null)}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdatePlan}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                                >
                                    {actionLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Confirmar Mudança'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL ADICIONAR MEMBRO */}
            {
                modalMode === 'member' && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative animate-slide-up">
                            <button onClick={() => setModalMode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>

                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 text-xl">
                                <i className="fa-solid fa-user-plus"></i>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 mb-2">Adicionar Membro</h3>
                            <p className="text-sm text-slate-500 mb-6 font-medium">O usuário deve já ter criado uma conta no sistema (mesmo que Grátis).</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 ml-1">Email do Usuário</label>
                                    <input
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        value={memberEmail}
                                        onChange={(e) => setMemberEmail(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setModalMode(null)}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                                >
                                    {actionLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Adicionar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
