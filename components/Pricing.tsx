import React, { useState } from 'react';
import { ViewState, UserProfile } from '../App';
import { createCheckoutSession } from '../services/supabaseClient';

interface PricingProps {
  onNavigate: (view: ViewState) => void;
  user: UserProfile | null;
}

type BillingCycle = 'monthly' | 'yearly';

const Pricing: React.FC<PricingProps> = ({ onNavigate, user }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);

  const plans = [
    {
      name: 'Grátis',
      price: { monthly: '0,00', yearly: '0,00' },
      description: 'Ideal para quem está começando a entender a reforma.',
      features: [
        '10 consultas de produtos',
        'Acesso por 7 dias',
        '1 Consulta via e-mail',
        '1 Solicitação de Cadastro/atualização'
      ],
      buttonText: 'Começar Grátis',
      highlight: false,
      color: 'slate',
      id: 'gratis'
    },
    {
      name: 'Start',
      price: { monthly: '74,90', yearly: '59,90' },
      priceIds: {
        monthly: 'price_1SjmM3FkPBkTRBNfqvA7GBuF',
        yearly: 'price_1SjRiwFkPBkTRBNfsjxZBscY'
      },
      description: 'Perfeito para pequenos negócios e autônomos.',
      features: [
        '300 Consultas por mês',
        '1 Usuário logado',
        'Histórico de buscas',
        '5 Consultas via e-mail',
        '30 Solicitações de Cadastro'
      ],
      buttonText: 'Assinar Start',
      highlight: false,
      color: 'blue',
      id: 'start'
    },
    {
      name: 'Pro',
      price: { monthly: '99,90', yearly: '74,90' },
      priceIds: {
        monthly: 'price_1SjmRuFkPBkTRBNfGsl9dfau',
        yearly: 'price_1SjmRKFkPBkTRBNflIqVvWzE'
      },
      description: 'A solução completa para empresas em crescimento.',
      features: [
        'Consultas ilimitadas',
        '1 Usuário logado',
        'Histórico de buscas',
        '15 Consultas via e-mail',
        '50 Solicitações de Cadastro'
      ],
      buttonText: 'Assinar Pro',
      highlight: true,
      color: 'brand',
      id: 'pro'
    },
    {
      name: 'Premium',
      price: { monthly: '129,90', yearly: '99,90' },
      priceIds: {
        monthly: 'price_1SjmSeFkPBkTRBNf0xExnXGD',
        yearly: 'price_1SjmT9FkPBkTRBNfuN3mH65n'
      },
      description: 'Gestão fiscal de alta performance para grandes volumes.',
      features: [
        'Consultas ilimitadas',
        'Suporte VIP 24/7',
        'Até 5 Usuários simultâneos',
        'Acesso antecipado',
        'Consultas e-mail ilimitadas',
        '100 Solicitações de Cadastro'
      ],
      buttonText: 'Assinar Premium',
      highlight: false,
      color: 'accent',
      id: 'premium'
    }
  ];

  const planOrder: Record<string, number> = {
    'gratis': 0,
    'start': 1,
    'pro': 2,
    'premium': 3,
    'enterprise': 4
  };

  const handleSubscribe = async (planId: string, priceId?: string) => {
    if (planId === 'gratis') {
      onNavigate('signup');
      return;
    }

    if (!user) {
      onNavigate('login');
      return;
    }

    // Regra de Carência: Bloquear Downgrades (Tier ou Ciclo)
    const currentPlan = user.organization?.plan_type || 'gratis';
    const currentIsCommitment = user.organization?.has_commitment;

    if (currentIsCommitment) {
      const currentLevel = planOrder[currentPlan] || 0;
      const targetLevel = planOrder[planId] || 0;

      // Se tentar diminuir o nível do plano OU mudar de Anual para Mensal
      const isTierDowngrade = targetLevel < currentLevel;
      const isCommitmentDowngrade = billingCycle === 'monthly';

      if (isTierDowngrade || isCommitmentDowngrade) {
        alert("Para alterar para um plano inferior ou sem carência, por favor entre em contato com nossa equipe financeira/comercial pelo WhatsApp.");
        window.open("https://wa.me/5534991564540", "_blank");
        return;
      }
    }

    if (!priceId) return;

    setLoadingPrice(priceId);
    try {
      console.log('Initiating checkout session...', {
        priceId,
        orgId: user.organization_id,
        userId: user.id
      });

      const response = await createCheckoutSession({
        priceId,
        orgId: user.organization_id,
        userId: user.id,
        successUrl: `${window.location.origin}/?session=success`,
        cancelUrl: `${window.location.origin}/?session=cancel`
      });

      console.log('Checkout session response:', response);

      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error(response?.error || 'Não foi possível gerar a URL de pagamento.');
      }
    } catch (err: any) {
      console.error('Stripe Subscribe Error:', err);
      const errorMsg = err.message || JSON.stringify(err);
      alert(`Erro ao iniciar pagamento: ${errorMsg}`);
    } finally {
      setLoadingPrice(null);
    }
  };

  return (
    <section className="pt-24 pb-14 bg-slate-50/50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest mb-3 shadow-xl shadow-brand-500/40 animate-pulse">
            <i className="fa-solid fa-star text-amber-400"></i>
            PROMOÇÃO DE INAUGURAÇÃO
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-1">
            Escolha o plano ideal <span className="text-brand-600">para você</span>
          </h2>
          <p className="text-slate-500 text-xs max-w-2xl mx-auto font-medium opacity-80 mb-6">
            Preços exclusivos de lançamento. Simplifique sua gestão tributária hoje.
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
              Mês - Sem Carência
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-12 h-6 bg-slate-200 rounded-full p-1 transition-colors hover:bg-slate-300"
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${billingCycle === 'yearly' ? 'translate-x-6 bg-brand-500' : ''}`} />
            </button>
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${billingCycle === 'yearly' ? 'text-brand-600' : 'text-slate-400'}`}>
              12 Meses - Com Carência <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md">Economize 20%</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl text-[10px] font-bold shadow-sm border border-emerald-100 mb-8">
            <i className="fa-solid fa-shield-check text-emerald-500"></i>
            GARANTIA DE 7 DIAS OU SEU DINHEIRO DE VOLTA
          </div>
        </div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col bg-white rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 animate-slide-up shadow-sm border ${plan.highlight ? 'border-brand-500 ring-4 ring-brand-500/5 shadow-2xl z-10' : 'border-slate-100'}`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg">
                  Mais Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-[10px] font-medium leading-tight min-h-[30px]">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-slate-400 text-sm font-black">R$</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">
                    {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                  </span>
                  <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">/mês</span>
                </div>
              </div>

              <div className="flex-grow space-y-2.5 mb-6">
                <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest border-b border-slate-50 pb-1.5">Incluso:</p>
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 group">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[8px]">
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <span className="text-[11px] text-slate-600 font-bold leading-none tracking-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={loadingPrice !== null}
                onClick={() => handleSubscribe(plan.id, plan.priceIds?.[billingCycle as keyof typeof plan.priceIds])}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50 ${plan.highlight
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
              >
                {loadingPrice === plan.priceIds?.[billingCycle as keyof typeof plan.priceIds] ? (
                  <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
                ) : null}
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl overflow-hidden relative border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 text-center md:text-left">
            <h4 className="text-xl font-black mb-1 tracking-tight">Solução sob medida?</h4>
            <p className="text-slate-400 text-[11px] font-medium">Planos empresariais e escritórios de contabilidade.</p>
          </div>
          <button
            onClick={() => window.open("https://wa.me/5534991564540", "_blank")}
            className="relative z-10 bg-brand-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-700 transition shadow-xl whitespace-nowrap"
          >
            Falar com Comercial
          </button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
