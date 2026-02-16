
import React, { useState } from 'react';
import { ViewState } from '../App';
import { supabase } from '../services/supabaseClient';

interface SignupProps {
  onNavigate: (view: ViewState) => void;
}

const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      alert("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    setIsLoading(true);

    if (!supabase) {
      alert("Erro de Configuração: Supabase não está configurado. Verifique as variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).");
      setIsLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: formData.name,
            phone: formData.phone,
            company_name: formData.company
          }
        }
      });

      if (authError) throw authError;

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
    <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden text-slate-900">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-20 right-10 w-80 h-80 bg-brand-100 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-accent-100 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
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
                  <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-brand-600"></i>
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
                  <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-brand-600"></i>
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
                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-brand-600"></i>
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
                <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-brand-600"></i>
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
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-brand-600"></i>
              </div>
            </div>

            {/* Checkbox de Termos */}
            <div className="flex items-start gap-3 px-1 py-1">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Eu li e aceito os{' '}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Termos de Uso
                </button>
                {' '}e a{' '}
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Política de Privacidade
                </button>.
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
              disabled={isLoading || !acceptedTerms}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Criar minha conta agora'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-xs text-slate-500 font-medium">
          Já possui uma conta?{' '}
          <button onClick={() => onNavigate('login')} className="text-brand-600 font-bold hover:underline">
            Fazer login
          </button>
        </p>
      </div>

      {/* Modal de Termos Integrado */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTermsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                  <i className="fa-solid fa-file-contract"></i>
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Termos de Uso</h3>
              </div>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition text-slate-400"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
              <div className="prose prose-slate prose-sm text-[11px] leading-relaxed text-slate-600">
                <p className="mb-4">Estes Termos e Condições de Uso (“Termos”) regulam o acesso e o uso da plataforma TributeiClass (“Plataforma”). Ao acessar ou utilizar a Plataforma, você declara que leu, entendeu e concorda com estes Termos.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">1. Definições</h4>
                <ul className="list-disc pl-4 space-y-1 mb-4">
                  <li><strong>Usuário:</strong> pessoa física ou jurídica que utiliza a Plataforma.</li>
                  <li><strong>Conta:</strong> cadastro do Usuário para acesso à área logada.</li>
                  <li><strong>Serviços:</strong> funcionalidades disponibilizadas, incluindo pesquisa/consulta e relatórios.</li>
                </ul>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">2. Objeto do serviço</h4>
                <p>O TributeiClass disponibiliza um sistema de pesquisa e organização de informações relacionadas à Reforma Tributária, com foco em IBS e CBS.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">3. Natureza informativa</h4>
                <p>A Plataforma tem finalidade informativa e de apoio. Ela não constitui consultoria tributária, contábil ou jurídica. O Usuário é o único responsável por validar informações antes de tomar decisões.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">4. Elegibilidade</h4>
                <p>O Usuário deve fornecer informações verdadeiras e é responsável pela confidencialidade de sua conta.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">5. Condutas Proibidas</h4>
                <p>É proibido copiar, vender, realizar engenharia reversa ou usar automações para extração massiva de dados sem autorização.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">6. Assinaturas e Reembolso</h4>
                <p>Pagamentos via Stripe. Reembolso integral em até 7 dias contados da contratação inicial em caso de cancelamento.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">7. Propriedade Intelectual</h4>
                <p>A plataforma e todo seu conteúdo (layout, algoritmos, marcas) são de propriedade exclusiva do TributeiClass.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">8. Histórico de Consultas</h4>
                <p>A plataforma armazena o histórico de consultas para fins de funcionalidade, auditoria e melhoria do serviço.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">9. Privacidade (LGPD)</h4>
                <p>O tratamento de dados pessoais segue nossa Política de Privacidade. Contato: suporte@tributeiclass.com.br.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">10. Disponibilidade e Suporte</h4>
                <p>Podem ocorrer interrupções por manutenção. Podemos alterar funcionalidades para evolução técnica do produto.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">11. Responsabilidade</h4>
                <p>O TributeiClass não se responsabiliza por decisões baseadas no conteúdo ou falhas de serviços de terceiros.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">12. Encerramento de conta</h4>
                <p>Podemos suspender acessos por violação destes termos. O usuário pode encerrar a conta a qualquer momento via plataforma.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">13. Comunicações</h4>
                <p>Enviamos avisos operacionais e de segurança. Comunicações promocionais seguem as normas de descadastro.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">14. Alterações</h4>
                <p>Estes termos podem ser atualizados. O uso continuado da plataforma indica concordância com a nova versão.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">15. Lei aplicável</h4>
                <p>Termos regidos pelas leis brasileiras. Foro eleito: Uberlândia/MG.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">16. Contato</h4>
                <p>E-mail: suporte@tributeiclass.com.br</p>

                <div className="mt-10 p-4 bg-brand-50 rounded-2xl text-center border border-brand-100">
                  <p className="font-bold text-brand-900 mb-3 text-xs tracking-tight">Deseja aceitar estes termos e prosseguir com o cadastro?</p>
                  <button
                    onClick={() => {
                      setAcceptedTerms(true);
                      setIsTermsModalOpen(false);
                    }}
                    className="bg-brand-600 text-white px-10 py-3 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                  >
                    Aceitar e Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Privacidade Integrado */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPrivacyModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Política de Privacidade</h3>
              </div>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition text-slate-400"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
              <div className="prose prose-slate prose-sm text-[11px] leading-relaxed text-slate-600">
                <p className="mb-4">Esta Política descreve como o TributeiClass coleta, usa e protege seus dados em conformidade com a LGPD. Ao utilizar a Plataforma, você declara ciência destas práticas.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">1. Controlador e Contato</h4>
                <p>O TributeiClass atua como Controlador. Canal DPO: suporte@tributeiclass.com.br</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">2. Dados Coletados</h4>
                <p>Coletamos dados cadastrais (nome/email), dados de autenticação, uso da plataforma (histórico), dados técnicos/logs e dados de pagamento (Stripe).</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">3. Finalidades</h4>
                <p>Usamos dados para gerir sua conta, fornecer o serviço, prevenir fraudes, gerir assinaturas e cumprir obrigações legais.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">4. Bases Legais</h4>
                <p>O tratamento baseia-se na execução de contrato, legítimo interesse e cumprimento de obrigação legal.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">5. Compartilhamento</h4>
                <p>Não vendemos seus dados. Compartilhamos com provedores essenciais (Stripe, Google, Infra) ou por ordem judicial.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">7. Retenção</h4>
                <p>Mantemos dados pelo tempo necessário para as finalidades descritas ou por obrigações legais/regulatórias.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">8. Segurança</h4>
                <p>Adotamos criptografia (HTTPS), controles de acesso e monitoramento para proteger suas informações.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">9. Seus Direitos</h4>
                <p>Você pode solicitar acesso, correção, eliminação ou portabilidade via suporte@tributeiclass.com.br.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">11. Cookies</h4>
                <p>Usamos cookies essenciais e analíticos para funcionamento e melhoria. Você pode gerir via navegador.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">12. Cobrança e Reembolso</h4>
                <p>A gestão financeira é processada via Stripe. Mantemos registros pelo prazo legal necessário.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">14. Alterações</h4>
                <p>Esta política pode ser atualizada. A versão vigente estará sempre disponível na plataforma.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest">15. Contato</h4>
                <p>Suporte: suporte@tributeiclass.com.br</p>

                <div className="mt-10 p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100">
                  <p className="font-bold text-emerald-900 mb-3 text-xs tracking-tight">Agradecemos a sua confiança em nossa plataforma.</p>
                  <button
                    onClick={() => setIsPrivacyModalOpen(false)}
                    className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    Entendi e concordo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
