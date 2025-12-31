import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface AdminDashboardProps {
    onNavigate: (view: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [selectedOrg, setSelectedOrg] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'plan' | 'member' | null>(null);

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
                        <p className="text-slate-500 font-medium">Gerencie assinaturas e acessos</p>
                    </div>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs shadow-sm transition flex items-center gap-2 uppercase tracking-wide"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        Voltar ao App
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-400 font-black uppercase bg-slate-50 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organização</th>
                                <th className="px-6 py-4">Dono (Email)</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Carência</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Dia Cobrança</th>
                                <th className="px-6 py-4 text-center">Membros</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {subscribers.map((org) => {
                                const owner = org.profiles?.[0]; // Assumindo relação
                                const statusKey = org.subscription_status || 'gratis';
                                return (
                                    <tr key={org.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800">{org.name}</td>
                                        <td className="px-6 py-4">{owner?.email || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${org.plan_type === 'premium' ? 'bg-purple-100 text-purple-700' :
                                                org.plan_type === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                                                    org.plan_type === 'enterprise' ? 'bg-slate-800 text-white' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {org.plan_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${org.has_commitment ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}
                                                `}>
                                                {org.has_commitment ? '12 Meses' : 'Mensal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${statusColors[statusKey] || 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {statusMap[statusKey] || statusKey}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-xs text-slate-600">
                                            {org.current_period_end
                                                ? new Date(org.current_period_end).toLocaleDateString('pt-BR')
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-center text-indigo-600 font-bold">
                                            {org.billing_day ? `Dia ${org.billing_day}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-center">
                                            <span className={`px-2 py-1 rounded-md ${(org.profiles?.length || 0) > (org.max_users || 1) ? 'bg-red-100 text-red-600 font-bold' : 'text-slate-600'
                                                }`}>
                                                {org.profiles?.length || 0} <span className="text-slate-400">/</span> {org.max_users || 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrg(org);
                                                    setNewPlan(org.plan_type);
                                                    setNewBillingDate(org.current_period_end ? new Date(org.current_period_end).toISOString().split('T')[0] : '');
                                                    setBillingDay(org.billing_day || '');
                                                    setHasCommitment(!!org.has_commitment);
                                                    setModalMode('plan');
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                                            >
                                                Mudar Plano
                                            </button>
                                            <button
                                                onClick={() => { setSelectedOrg(org); setModalMode('member'); }}
                                                disabled={!['premium', 'enterprise'].includes(org.plan_type)}
                                                title={!['premium', 'enterprise'].includes(org.plan_type) ? "Disponível apenas no Premium" : "Adicionar Membro"}
                                                className={`font-bold text-xs px-3 py-1.5 rounded-lg transition ${['premium', 'enterprise'].includes(org.plan_type)
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
