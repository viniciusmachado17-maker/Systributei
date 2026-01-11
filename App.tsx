
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Timeline from './components/Timeline';
import SectorImpact from './components/SectorImpact';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Login from './components/Login';
import Signup from './components/Signup';
import Pricing from './components/Pricing';
import Dashboard from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import ResetPassword from './components/ResetPassword';

import { testSupabaseConnection, supabase } from './services/supabaseClient';

export type ViewState = 'landing' | 'login' | 'signup' | 'pricing' | 'dashboard' | 'admin' | 'reset-password';

export interface Organization {
  id: string;
  name: string;
  plan_type: 'gratis' | 'start' | 'pro' | 'premium' | 'enterprise';
  usage_count: number;
  usage_limit: number;
  request_count: number;
  request_limit: number;
  email_count: number;
  email_limit: number;
  trial_ends_at: string | null;
  max_users: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'gratis';
  current_period_end?: string;
  has_commitment?: boolean;
  cancel_at_period_end?: boolean;
  price_id?: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  organization?: Organization; // Optional for when we join
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [nextView, setNextView] = useState<ViewState | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Captura imediata se é um link de recuperação ANTES do Supabase limpar o hash
  const isRecoveryLink = useMemo(() => {
    return window.location.hash.includes('type=recovery') ||
      window.location.href.includes('type=recovery');
  }, []);

  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 1. Testa Conexão
        const conn = await testSupabaseConnection();
        if (!conn.success) console.error("Supabase Connection Failed:", conn.message);

        // 2. Recupera Sessão Ativa
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // 3. Busca Perfil
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              name, email, role,
              organization:organizations (*)
            `)
            .eq('id', session.user.id)
            .single();

          if (profile && !profileError) {
            const userRole = profile.email === 'adm@tributeiclass.com.br'
              ? 'admin'
              : 'user';

            const userProfile: UserProfile = {
              id: session.user.id,
              organization_id: (profile as any).organization?.id,
              name: profile.name || 'Usuário',
              email: profile.email || session.user.email || '',
              role: userRole,
              organization: (profile as any).organization
            };
            setUser(userProfile);

            // 4. Decisão de Navegação
            const params = new URLSearchParams(window.location.search);

            // Prioridade máxima: se detectamos que é um link de recuperação, NUNCA vai pro Dashboard agora
            if (isRecoveryLink) {
              console.log("🔒 Modo de recuperação detectado na inicialização.");
              setCurrentView('reset-password');
              return;
            }

            if (params.get('session') === 'success') {
              setCurrentView('dashboard');
              const newUrl = window.location.pathname;
              window.history.replaceState({}, document.title, newUrl);
            } else {
              // Se já estiver logado (fluxo normal), cai no dash
              setCurrentView('dashboard');
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Listener para eventos de Auth (importante para Password Recovery e Sincronia entre Abas)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);

      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset-password');
      }

      // Se houver um login em outra aba mas a aba atual está no modo recovery, NÃO navega
      if (event === 'SIGNED_IN' && isRecoveryLink) {
        setCurrentView('reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navigateTo = (view: ViewState, profile?: UserProfile) => {
    if (profile) {
      setUser(profile);
      // Se houver um redirecionamento pendente (ex: vindo do pricing), vai para ele
      // Caso contrário, vai para a view solicitada (geralmente 'dashboard')
      setCurrentView(nextView || view);
      setNextView(null);
    } else {
      // Se estiver indo para o login a partir do pricing, salva para voltar depois
      if (view === 'login' && currentView === 'pricing') {
        setNextView('pricing');
      }
      setCurrentView(view);
    }
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    }
    setUser(null);
    setCurrentView('landing');
    setNextView(null);
    window.scrollTo(0, 0);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-50">
      {/* Navbar apenas para quem não está na dashboard ou admin */}
      {currentView !== 'dashboard' && currentView !== 'admin' && (
        <Navbar onNavigate={navigateTo} currentView={currentView} user={user} />
      )}

      <main>
        {currentView === 'landing' && (
          <>
            <Hero />
            <Features />
            <Timeline />
            <SectorImpact />
            <FAQ />
          </>
        )}
        {currentView === 'login' && <Login onNavigate={navigateTo} />}
        {currentView === 'signup' && <Signup onNavigate={navigateTo} />}
        {currentView === 'pricing' && <Pricing onNavigate={navigateTo} user={user} />}
        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onNavigate={navigateTo}
          />
        )}
        {currentView === 'admin' && <AdminDashboard onNavigate={navigateTo} />}
        {currentView === 'reset-password' && (
          <ResetPassword onComplete={() => setCurrentView('login')} />
        )}
      </main>

      {currentView !== 'dashboard' && <Footer />}
    </div>
  );
};

export default App;
