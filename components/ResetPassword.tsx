
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface ResetPasswordProps {
    onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Desloga a sessão temporária de recuperação para forçar o login com a nova senha
            await supabase.auth.signOut();

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 3000);
        } catch (err: any) {
            console.error("Erro ao atualizar senha:", err);
            setError(err.message || "Erro ao atualizar senha.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 border border-slate-100">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nova Senha</h2>
                        <p className="text-slate-500 text-xs mt-2">Defina sua nova senha de acesso</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-slide-up">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                                <i className="fa-solid fa-check"></i>
                            </div>
                            <p className="text-sm font-bold text-slate-600 uppercase tracking-tighter">Senha atualizada com sucesso!</p>
                            <p className="text-xs text-slate-400">Você será redirecionado para o login em instantes...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Nova Senha</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs font-medium"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Confirmar Senha</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs font-medium"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                            >
                                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Atualizar Senha'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
