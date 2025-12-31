
import React, { useState } from 'react';
import { ViewState } from '../App';
import { supabase } from '../services/supabaseClient';

interface SignupProps {
  onNavigate: (view: ViewState) => void;
}

const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!supabase) {
      alert("Erro de Configuração: Supabase não está configurado. Verifique as variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Criar usuário no Supabase Auth
      // O Trigger 'on_auth_user_created' no banco vai criar automaticamente:
      // - A Organização
      // - O Perfil do Usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            company_name: formData.company // Passando para o Trigger usar
          }
        }
      });

      if (authError) throw authError;

      // Sucesso
      alert("Conta criada com sucesso! Se necessário, verifique seu email.");
      onNavigate('login');

    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      alert(error.message || "Ocorreu um erro ao criar sua conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* ... (rest of the UI remains the same, assuming imports are correct) ... */}
      {/* Just mapping the UI back correctly */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-20 right-10 w-80 h-80 bg-brand-100 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-accent-100 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        {/* We need to keep the form UI exactly as it was, just ensure the onSubmit calls our new handleSubmit */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-8 md:p-10 border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Comece agora</h2>
            <p className="text-slate-500 text-xs mt-2">Classifique seus produtos de acordo com a nova Reforma em segundos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Nome Completo</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Seu nome"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Empresa (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nome da empresa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                  <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="exemplo@empresa.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">WhatsApp</label>
              <div className="relative">
                <input
                  required
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Criar Senha</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-xs"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 flex gap-3">
              <div className="text-brand-600 mt-0.5">
                <i className="fa-solid fa-gift"></i>
              </div>
              <p className="text-[10px] font-medium text-brand-700 leading-tight">
                <strong>Bônus:</strong> Ao se cadastrar hoje, você ganha 7 dias de acesso a plataforma com até 10 consultas gratís e um guia prático sobre IBS/CBS.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Criar minha conta agora'}
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400 mt-6 leading-relaxed">
            Ao se cadastrar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>

        <p className="text-center mt-8 text-xs text-slate-500 font-medium">
          Já possui uma conta?{' '}
          <button onClick={() => onNavigate('login')} className="text-brand-600 font-bold hover:underline">
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
