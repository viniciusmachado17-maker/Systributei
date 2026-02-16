
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
                            <p className="text-emerald-100 font-medium">Última atualização: 15/02/2026</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="prose prose-slate max-w-none">
                            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
                                A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o TributeiClass (“TributeiClass”, “nós”) coleta, usa, armazena, compartilha e protege dados pessoais no site e aplicativo web <a href="https://tributeiclass.com.br" className="text-brand-600 font-bold hover:underline">https://tributeiclass.com.br</a> (“Plataforma”).
                            </p>

                            <p className="text-slate-600 leading-relaxed mb-10">
                                Tratamos dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD), o Marco Civil da Internet (Lei nº 12.965/2014), o Código de Defesa do Consumidor (Lei nº 8.078/1990) e demais normas aplicáveis.
                            </p>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">1. Controlador e canal de contato</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    O TributeiClass atua como Controlador dos dados pessoais tratados na Plataforma, definindo as finalidades e os meios de tratamento.
                                </p>
                                <p className="text-slate-600 text-sm font-bold mt-2 italic">Canal de Privacidade (Encarregado/DPO): suporte@tributeiclass.com.br</p>
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
                                    <p><strong>Importante:</strong> não solicitamos dados pessoais desnecessários. Caso você opte por não fornecer determinados dados, pode ser que não seja possível utilizar algumas funcionalidades (por exemplo, criar conta e acessar áreas restritas).</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">3. Para quais finalidades usamos os dados</h3>
                                <p className="text-slate-600 text-sm mb-4">Usamos dados pessoais para:</p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                                    <li>criar e administrar sua conta (cadastro, acesso, suporte e comunicações operacionais);</li>
                                    <li>autenticar e manter sua sessão (login, segurança e prevenção de acessos indevidos);</li>
                                    <li>fornecer e melhorar a Plataforma (funcionalidades, performance, estabilidade e correções);</li>
                                    <li>prevenir fraudes e abusos e manter a segurança (monitoramento, logs e detecção de atividades suspeitas);</li>
                                    <li>gerenciar assinaturas, cobranças, cancelamentos e reembolsos (processamento de pagamento, gestão do plano e registros operacionais);</li>
                                    <li>cumprir obrigações legais e regulatórias e atender solicitações de autoridades competentes;</li>
                                    <li>análises estatísticas e métricas de uso para entender como a Plataforma é utilizada e aprimorar a experiência do usuário.</li>
                                </ul>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">4. Bases legais (LGPD)</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>O TributeiClass realiza o tratamento de dados pessoais com fundamento nas bases legais previstas na LGPD, especialmente:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>execução de contrato e procedimentos preliminares (cadastro, acesso e uso do serviço; gestão de assinatura);</li>
                                        <li>legítimo interesse (prevenção a fraudes, segurança, melhoria do produto e métricas de uso, com avaliação e respeito aos seus direitos);</li>
                                        <li>cumprimento de obrigação legal ou regulatória;</li>
                                        <li>consentimento, quando aplicável (por exemplo, determinados cookies não essenciais, conforme suas preferências).</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">5. Compartilhamento de dados com terceiros</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Não vendemos seus dados pessoais. Podemos compartilhar dados somente quando necessário para operar a Plataforma, cumprir obrigações legais ou proteger direitos, nos seguintes casos:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>provedores de tecnologia e infraestrutura (hospedagem, armazenamento, monitoramento), estritamente para viabilizar a operação;</li>
                                        <li>Google Analytics, para análises estatísticas de uso da Plataforma (cookies e identificadores);</li>
                                        <li>Stripe, para processamento de assinaturas, cobranças e eventuais reembolsos, incluindo prevenção a fraudes e gestão da cobrança;</li>
                                        <li>autoridades públicas, mediante ordem judicial, requisição legal ou obrigação regulatória.</li>
                                    </ul>
                                    <p>Exigimos que fornecedores e parceiros adotem medidas de segurança e privacidade compatíveis com a legislação e tratem os dados conforme nossas instruções, quando aplicável.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">6. Transferência internacional de dados</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Alguns provedores (por exemplo, Google Analytics e Stripe) podem processar dados em servidores localizados fora do Brasil. Nesses casos, adotamos medidas para que a transferência internacional ocorra de forma adequada, conforme a LGPD e padrões contratuais do mercado.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">7. Retenção e eliminação</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Reteremos dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta Política, inclusive para:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>manter sua conta ativa;</li>
                                        <li>cumprir obrigações legais, regulatórias e de auditoria;</li>
                                        <li>resolver disputas, prevenir fraudes e manter a segurança;</li>
                                        <li>preservar registros de acesso, quando aplicável;</li>
                                        <li>manter registros operacionais de assinatura/pagamento/reembolso, quando aplicável.</li>
                                    </ul>
                                    <p>Quando a retenção não for mais necessária, os dados serão eliminados ou anonimizados, observadas as obrigações legais e prazos aplicáveis.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">8. Segurança da informação</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Adotamos medidas técnicas e administrativas razoáveis para proteger dados pessoais contra acessos não autorizados, destruição, perda, alteração, comunicação ou difusão indevida. Entre elas:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>criptografia em trânsito (HTTPS/TLS);</li>
                                        <li>controles de acesso e autenticação;</li>
                                        <li>logs e monitoramento de segurança;</li>
                                        <li>boas práticas de desenvolvimento e atualizações.</li>
                                    </ul>
                                    <p>Apesar disso, nenhum sistema é 100% seguro. Em caso de incidentes relevantes, adotaremos as medidas cabíveis e, quando exigido, comunicaremos autoridades e titulares conforme a LGPD.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">9. Direitos do titular (LGPD)</h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">Você pode solicitar, a qualquer momento, nos termos da LGPD:</p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                                    <li>confirmação da existência de tratamento;</li>
                                    <li>acesso aos dados;</li>
                                    <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                                    <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
                                    <li>portabilidade (quando aplicável e conforme regulamentação);</li>
                                    <li>eliminação dos dados tratados com consentimento (quando aplicável);</li>
                                    <li>informação sobre compartilhamentos;</li>
                                    <li>informação sobre a possibilidade de não consentir e suas consequências (quando aplicável);</li>
                                    <li>revogação do consentimento (quando aplicável).</li>
                                </ul>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">10. Como exercer seus direitos</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Para alterar seus dados cadastrais, acesse “Minha Conta” (quando disponível).</p>
                                    <p>Para solicitações relacionadas a privacidade e direitos do titular, entre em contato pelo e-mail <strong>suporte@tributeiclass.com.br</strong>.</p>
                                    <p>As solicitações serão avaliadas e respondidas em prazo razoável, conforme a LGPD e regulamentações aplicáveis, podendo haver necessidade de confirmação de identidade para proteção do titular.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">11. Política de Cookies</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Cookies são pequenos arquivos armazenados no seu navegador/dispositivo para viabilizar funcionalidades, segurança e melhorar sua experiência. Também podemos utilizar tecnologias semelhantes (tags e pixels).</p>
                                    <p>Usamos:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>cookies essenciais (necessários):</strong> autenticação, manutenção de sessão, segurança e funcionamento básico da Plataforma;</li>
                                        <li><strong>cookies de desempenho/analíticos (Google Analytics):</strong> medir e entender como a Plataforma é utilizada, ajudando na melhoria do serviço.</li>
                                    </ul>
                                    <p>Você pode gerenciar cookies nas configurações do seu navegador. A desativação de cookies essenciais pode impedir o funcionamento correto do login e de recursos da Plataforma.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">12. Cancelamento, cobrança e reembolso (informações de privacidade)</h3>
                                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                    <p>Quando o Usuário contrata um Plano, informações necessárias para gestão de assinatura, cobrança, cancelamento e reembolso podem ser tratadas e compartilhadas com a Stripe para viabilizar o pagamento e a operação financeira.</p>
                                    <p>As regras comerciais (incluindo prazos e condições de reembolso) estão descritas nos Termos e Condições de Uso e/ou no checkout. Em caso de reembolso, manteremos registros operacionais relacionados à cobrança e ao status do reembolso pelo tempo necessário para cumprir finalidades legais, contábeis e de segurança.</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">13. Links para sites externos</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    A Plataforma pode conter links para sites de terceiros. Não controlamos e não nos responsabilizamos pelas práticas de privacidade desses sites. Recomendamos que você leia as respectivas políticas.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">14. Alterações desta Política</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Esta Política pode ser atualizada para refletir melhorias na Plataforma ou mudanças legais. A versão vigente estará disponível no site/app, e as alterações passam a valer a partir da publicação.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">15. Contato</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Se você tiver dúvidas sobre esta Política ou sobre como tratamos dados pessoais, fale conosco: <strong>suporte@tributeiclass.com.br</strong>
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
