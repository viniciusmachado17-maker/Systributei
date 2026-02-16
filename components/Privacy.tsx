
import React from 'react';
import { ViewState } from '../App';

interface PrivacyProps {
    onNavigate: (view: ViewState) => void;
}

const Privacy: React.FC<PrivacyProps> = ({ onNavigate }) => {
    return (
        <div className="bg-slate-50 min-h-screen pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-emerald-600 p-8 md:p-12 text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">Política de Privacidade</h1>
                            <p className="text-emerald-100 font-medium">Última atualização: 15 de Fevereiro de 2026</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* TL;DR Section */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-10">
                            <h2 className="text-emerald-900 font-black uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                <i className="fa-solid fa-bolt"></i> Resumo Rápido (TL;DR)
                            </h2>
                            <p className="text-emerald-800 text-sm leading-relaxed">
                                O TributeiClass coleta dados como nome, e-mail, senha protegida (hash), logs e histórico de uso/consultas para permitir login, fornecer o serviço, melhorar a Plataforma e manter segurança. Usamos Google Analytics para métricas e Stripe para processar assinaturas — sem armazenar, em regra, dados sensíveis do cartão. Não vendemos seus dados. Você pode solicitar acesso/correção/eliminação e demais direitos LGPD pelo e-mail suporte@tributeiclass.com.br. Cookies essenciais são necessários para login; cookies analíticos ajudam a melhorar a experiência.
                            </p>
                        </div>

                        <div className="prose prose-slate max-w-none">
                            <p className="text-slate-600 leading-relaxed mb-8">
                                A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o TributeiClass (“TributeiClass”, “nós”) coleta, usa, armazena, compartilha e protege dados pessoais no site e aplicativo web <a href="https://tributeiclass.com.br" className="text-brand-600 font-bold hover:underline">https://tributeiclass.com.br</a> (“Plataforma”).
                            </p>

                            <p className="text-slate-600 leading-relaxed mb-8">
                                Tratamos dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD), o Marco Civil da Internet (Lei nº 12.965/2014), o Código de Defesa do Consumidor (Lei nº 8.078/1990) e demais normas aplicáveis.
                            </p>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">1. Controlador e canal de contato</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    O TributeiClass atua como Controlador dos dados pessoais tratados na Plataforma, definindo as finalidades e os meios de tratamento.
                                </p>
                                <p className="text-slate-600 text-sm font-bold mt-2">Canal de Privacidade (Encarregado/DPO): suporte@tributeiclass.com.br</p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">2. Quais dados pessoais coletamos</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Podemos coletar as seguintes categorias de dados, conforme sua interação com a Plataforma:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Dados cadastrais:</strong> nome e e-mail.</li>
                                        <li><strong>Dados de autenticação:</strong> senha armazenada de forma protegida (hash) e dados relacionados ao login/sessão.</li>
                                        <li><strong>Dados de uso da Plataforma:</strong> histórico de consultas/pesquisas realizadas, recursos utilizados, preferências e eventos de navegação dentro do app.</li>
                                        <li><strong>Dados técnicos e logs:</strong> endereço IP, data e hora de acesso, identificadores de dispositivo/navegador, páginas/telas acessadas, logs de erro e segurança.</li>
                                        <li><strong>Dados de pagamento (assinatura):</strong> informações necessárias para cobrança e controle de assinatura (por exemplo, status do pagamento, ID da transação/assinatura, plano, datas de cobrança e status de reembolso).</li>
                                    </ul>
                                    <p className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                                        <strong>Observação:</strong> dados sensíveis do cartão (como número completo e CVV) são processados pelo provedor de pagamentos e, em regra, não ficam armazenados em nossos servidores.
                                    </p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">3. Para quais finalidades usamos os dados</h3>
                                <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                                    <li>Criar e administrar sua conta (cadastro, acesso, suporte e comunicações operacionais);</li>
                                    <li>Autenticar e manter sua sessão (login, segurança e prevenção de acessos indevidos);</li>
                                    <li>Fornecer e melhorar a Plataforma (funcionalidades, performance, estabilidade e correções);</li>
                                    <li>Prevenir fraudes e abusos e manter a segurança (monitoramento, logs e detecção de atividades suspeitas);</li>
                                    <li>Gerenciar assinaturas, cobranças, cancelamentos e reembolsos;</li>
                                    <li>Cumprir obrigações legais e regulatórias;</li>
                                    <li>Análises estatísticas e métricas de uso.</li>
                                </ul>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">4. Bases legais (LGPD)</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>O TributeiClass realiza o tratamento de dados pessoais com fundamento nas bases legais previstas na LGPD, especialmente:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Execução de contrato e procedimentos preliminares;</li>
                                        <li>Legítimo interesse (prevenção a fraudes, segurança, melhoria do produto);</li>
                                        <li>Cumprimento de obrigação legal ou regulatória;</li>
                                        <li>Consentimento, quando aplicável.</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">5. Compartilhamento de dados com terceiros</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Não vendemos seus dados pessoais. Podemos compartilhar dados somente quando necessário, com:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Provedores de tecnologia e infraestrutura (como Supabase para armazenamento);</li>
                                        <li>Google Analytics, para análises estatísticas;</li>
                                        <li>Stripe, para processamento de assinaturas e cobranças;</li>
                                        <li>Autoridades públicas, mediante ordem judicial ou obrigação legal.</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">6. Transferência internacional de dados</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Alguns provedores (como Google Analytics e Stripe) podem processar dados em servidores fora do Brasil. Adotamos medidas para que a transferência ocorra de forma segura e conforme a LGPD.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">7. Retenção e eliminação</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Reteremos dados pessoais pelo tempo necessário para cumprir as finalidades descritas, resolver disputas e cumprir obrigações legais. Quando não mais necessária, a informação será eliminada ou anonimizada.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">9. Direitos do titular (LGPD)</h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                    Você pode solicitar acesso, correção, eliminação, portabilidade ou revogar o consentimento a qualquer momento.
                                </p>
                                <p className="text-slate-600 text-sm font-bold">
                                    Para exercer seus direitos, entre em contato: suporte@tributeiclass.com.br
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">11. Política de Cookies</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Usamos cookies essenciais para funcionamento e segurança, e cookies analíticos (Google Analytics) para melhoria do serviço. Você pode gerenciar as preferências no seu navegador.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">12. Cancelamento, cobrança e reembolso</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Informações necessárias para gestão financeira são processadas via Stripe. Regras de reembolso estão descritas nos Termos de Uso.
                                </p>
                            </section>

                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                                <button
                                    onClick={() => onNavigate('landing')}
                                    className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-arrow-left"></i> Voltar ao Início
                                </button>
                                <p className="text-slate-400 text-xs text-right italic leading-relaxed">
                                    TributeiClass - Uberlândia, MG<br />
                                    suporte@tributeiclass.com.br
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
