
import React, { useState } from 'react';
import { ViewState, UserProfile } from '../App';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onNavigate: (view: ViewState, profile?: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoading(true);
    setError(null);

    if (!supabase) {
      setError("Erro de Configuração: Supabase não está conectado.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Auth com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Usuário não encontrado.");
      }

      // 2. Buscar Perfil e Dados da Organização
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          name, 
          email, 
          role,
          organization:organizations (
            id, name, plan_type, usage_count, usage_limit, trial_ends_at, max_users
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // Se logou mas não tem perfil, algo está errado com a integridade
        console.error("Login sucesso, mas falha ao buscar perfil:", profileError);
        throw new Error("Erro ao carregar dados do usuário.");
      }

      // 3. Sucesso
      const userRole = profile.email === 'adm@tributeiclass.com.br' ? 'admin' : 'user';

      onNavigate('dashboard', {
        id: authData.user.id,
        organization_id: (profile as any).organization?.id,
        name: profile.name || 'Usuário',
        email: profile.email || formData.email,
        role: userRole,
        organization: (profile as any).organization
      });

    } catch (err: any) {
      console.error("Erro login:", err);
      // Helper para mensagem amigável
      let msg = "Falha ao entrar.";
      if (err.message === "Invalid login credentials") msg = "E-mail ou senha incorretos.";
      else if (err.message.includes("Email not confirmed")) msg = "E-mail não confirmado. Verifique sua caixa de entrada.";
      else if (err.message.includes("Usuário não encontrado")) msg = "Conta não encontrada.";
      else msg = err.message; // Fallback para outros erros (ex: RLS, Network)

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-8 md:p-10 border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-xs mt-2">Acesse sua conta para gerenciar suas classificações</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-slide-up">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="exemplo@empresa.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Senha</label>
                <button type="button" className="text-[10px] font-bold text-brand-600 hover:underline">Esqueceu a senha?</button>
              </div>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="remember" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="remember" className="text-[10px] font-medium text-slate-500">Manter conectado neste dispositivo</label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Entrar na Plataforma'}
            </button>
          </form>


        </div>

        <p className="text-center mt-8 text-xs text-slate-500 font-medium">
          Ainda não tem acesso?{' '}
          <button onClick={() => onNavigate('signup')} className="text-brand-600 font-bold hover:underline">
            Crie sua conta gratuitamente
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
