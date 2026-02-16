
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
                <p className="mb-4">Estes Termos e Condições de Uso (“Termos”) regulam o acesso e o uso da plataforma TributeiClass (“Plataforma”). Ao acessar ou utilizar a Plataforma, você declara que leu, entendeu e concorda com estes Termos. Se você não concordar, não utilize a Plataforma.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">1. Definições</h4>
                <ul className="list-disc pl-4 space-y-1 mb-4 text-[10px]">
                  <li><strong>Usuário:</strong> pessoa física ou jurídica que utiliza a Plataforma.</li>
                  <li><strong>Conta:</strong> cadastro do Usuário para acesso à área logada.</li>
                  <li><strong>Serviços:</strong> pesquisa/consulta, histórico, relatórios e recursos correlatos.</li>
                  <li><strong>Conteúdo:</strong> informações, classificações e materiais geradores pela Plataforma.</li>
                  <li><strong>Assinatura/Plano:</strong> modalidade de contratação paga ou gratuita.</li>
                </ul>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">2. Objeto do Serviço</h4>
                <p>Sistema de pesquisa e organização de informações relacionadas à Reforma Tributária (IBS e CBS) aplicáveis a produtos.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">3. Natureza Informativa – não é consultoria</h4>
                <p>3.1. A Plataforma tem finalidade informativa. Não constitui consultoria tributária, contábil ou jurídica.</p>
                <p>3.2. O Usuário é o único responsável por validar informações antes de emitir documentos fiscais ou efetuar recolhimentos.</p>
                <p>3.3. Não garantimos que todo Conteúdo esteja completo ou infalível devido às constantes mudanças legislativas.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">4. Elegibilidade e Cadastro</h4>
                <p>O Usuário deve fornecer informações verdadeiras e é responsável pela confidencialidade de sua Conta.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">5. Uso Permitido e Condutas Proibidas</h4>
                <p>Proibido: copiar/vender conteúdo sem autorização; engenharia reversa; uso de robôs/scrapers; burlar limites de segurança.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">6. Assinaturas e Reembolso (Stripe)</h4>
                <p>6.1. Planos e preços descritos no checkout. Pagamentos via Stripe.</p>
                <p>6.3. Renovação automática habilitada. Cancelamento interrompe renovações futuras.</p>
                <p>6.5. <strong>Reembolso em 7 dias:</strong> Garantido para cancelamentos em até 7 dias da contratação inicial.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">7. Propriedade Intelectual</h4>
                <p>A Plataforma, marcas e funcionalidades são de propriedade exclusiva do TributeiClass.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">8. Conteúdo do Usuário e Histórico</h4>
                <p>Armazenamos histórico para funcionalidades e segurança, conforme Política de Privacidade.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">9. Privacidade (LGPD)</h4>
                <p>O tratamento de dados é regido por nossa Política de Privacidade. Contato: suporte@tributeiclass.com.br</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">10. Disponibilidade e Suporte</h4>
                <p>Não garantimos funcionamento ininterrupto. Podemos atualizar ou suspender recursos para melhoria técnica.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">11. Limitação de Responsabilidade</h4>
                <p>Não nos responsabilizamos por decisões baseadas no Conteúdo ou falhas de terceiros. Responsabilidade limitada ao valor pago nos últimos 3 meses.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">12. Suspensão e Encerramento</h4>
                <p>Podemos encerrar o acesso por violação destes Termos ou suspeita de fraude.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">13. Comunicações</h4>
                <p>Enviamos avisos operacionais. Promoções possuem opção de descadastro.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">14. Alterações destes Termos</h4>
                <p>Estes Termos podem ser atualizados. O uso continuado indica concordância com a nova versão.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">15. Lei Aplicável e Foro</h4>
                <p>Leis do Brasil. Foro eleito: Uberlândia/MG.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">16. Contato</h4>
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
                <p className="mb-4 font-medium">A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o TributeiClass coleta, usa, armazena, compartilha e protege dados pessoais.</p>
                <p className="mb-6">Tratamos dados em conformidade com a LGPD (Lei nº 13.709/2018), Marco Civil da Internet e demais normas aplicáveis.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">1. Controlador e Contato</h4>
                <p>O TributeiClass atua como Controlador. Canal DPO: suporte@tributeiclass.com.br</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">2. Dados Coletados</h4>
                <ul className="list-disc pl-4 space-y-1 mb-4">
                  <li><strong>Cadastrais:</strong> nome e e-mail.</li>
                  <li><strong>Autenticação:</strong> hash de senha e dados de login.</li>
                  <li><strong>Uso:</strong> histórico de consultas e preferências.</li>
                  <li><strong>Técnicos:</strong> IP, dispositivo e logs de acesso.</li>
                  <li><strong>Pagamento:</strong> geridos via Stripe (não armazenamos dados sensíveis do cartão).</li>
                </ul>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">3. Finalidades</h4>
                <p>Administração de conta, suporte, autenticação, melhoria do serviço, prevenção a fraudes e gestão de assinaturas.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">4. Bases Legais</h4>
                <p>Execução de contrato, legítimo interesse e cumprimento de obrigação legal.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">5. Compartilhamento</h4>
                <p>Não vendemos seus dados. Compartilhamos com provedores de infraestrutura, Stripe e autoridades judiciais quando necessário.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">6. Transferência Internacional</h4>
                <p>Ocorre para servidores de parceiros como Google e Stripe, seguindo padrões de segurança.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">7. Retenção e Eliminação</h4>
                <p>Dados mantidos conforme finalidade ou obrigações legais. Eliminados quando não forem mais necessários.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">8. Segurança</h4>
                <p>Adotamos HTTPS, criptografia e monitoramento constante contra acessos indevidos.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">9. Direitos do Titular</h4>
                <p>Acesso, correção, eliminação, portabilidade e revogação de consentimento via suporte@tributeiclass.com.br.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">11. Cookies</h4>
                <p>Essenciais para funcionamento e analíticos para melhora da experiência. Gestão via navegador.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">12. Cobrança e Reembolso</h4>
                <p>Gestão financeira via Stripe. Registros mantidos pelo prazo legal exigido.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">14. Alterações</h4>
                <p>Política atualizável. A versão vigente está sempre disponível na plataforma.</p>

                <h4 className="font-bold text-slate-900 mt-6 mb-2 uppercase text-[10px] tracking-widest border-b border-slate-100 pb-1">15. Contato</h4>
                <p>suporte@tributeiclass.com.br</p>

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
