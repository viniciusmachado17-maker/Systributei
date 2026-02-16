
import React from 'react';
import { ViewState } from '../App';

interface TermsProps {
    onNavigate: (view: ViewState) => void;
}

const Terms: React.FC<TermsProps> = ({ onNavigate }) => {
    return (
        <div className="bg-slate-50 min-h-screen pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-brand-600 p-8 md:p-12 text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">Termos e Condições de Uso</h1>
                            <p className="text-brand-100 font-medium">Última atualização: 15 de Fevereiro de 2026</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed mb-8">
                            Estes Termos e Condições de Uso (“Termos”) regulam o acesso e o uso da plataforma TributeiClass (“Plataforma”). Ao acessar ou utilizar a Plataforma, você declara que leu, entendeu e concorda com estes Termos. Se você não concordar, não utilize a Plataforma.
                        </p>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">1. Definições</h2>
                            <ul className="space-y-3 text-slate-600 text-sm">
                                <li><strong>Usuário:</strong> pessoa física ou jurídica que utiliza a Plataforma.</li>
                                <li><strong>Conta:</strong> cadastro do Usuário para acesso à área logada.</li>
                                <li><strong>Serviços:</strong> funcionalidades disponibilizadas, incluindo pesquisa/consulta, histórico, relatórios e recursos correlatos.</li>
                                <li><strong>Conteúdo:</strong> informações, textos, classificações, registros e materiais exibidos/gerados pela Plataforma.</li>
                                <li><strong>Assinatura/Plano:</strong> modalidade de contratação paga ou gratuita, com regras específicas de acesso.</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">2. Objeto do serviço</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                O TributeiClass disponibiliza um sistema de pesquisa e organização de informações relacionadas à Reforma Tributária, com foco em IBS e CBS aplicáveis a produtos, por meio de ferramentas de consulta, filtros, registros e outros recursos descritos na Plataforma.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">3. Natureza informativa – não é consultoria tributária, contábil ou jurídica</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>3.1. A Plataforma tem finalidade informativa e de apoio. Ela não constitui consultoria tributária, contábil ou jurídica, nem substitui análise profissional especializada.</p>
                                <p>3.2. Regras e enquadramentos tributários podem depender de múltiplos fatores (fatos geradores, documentação, classificações, exceções, interpretações e regulamentações). O Usuário é o único responsável por validar informações antes de tomar decisões, parametrizar sistemas, emitir documentos fiscais ou efetuar recolhimentos.</p>
                                <p>3.3. A Reforma Tributária e normas correlatas podem sofrer alterações e interpretações. Por isso, o TributeiClass não garante que todo Conteúdo esteja completo, atualizado ou aplicável a todos os casos.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">4. Elegibilidade e cadastro</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>4.1. Para utilizar a área logada, o Usuário deve criar uma Conta e fornecer informações verdadeiras e atualizadas.</p>
                                <p>4.2. O Usuário é responsável por manter a confidencialidade das credenciais de acesso e por toda atividade realizada em sua Conta.</p>
                                <p>4.3. Se você utiliza a Plataforma em nome de uma empresa, declara possuir poderes para aceitar estes Termos em nome dela.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">5. Uso permitido e condutas proibidas</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>5.1. Você concorda em utilizar a Plataforma apenas para fins lícitos e de acordo com estes Termos.</p>
                                <p>5.2. É proibido:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Copiar, reproduzir, vender, revender, sublicenciar, distribuir ou explorar comercialmente a Plataforma/Conteúdo sem autorização;</li>
                                    <li>Realizar engenharia reversa, descompilar ou tentar obter o código-fonte;</li>
                                    <li>Usar robôs, scrapers ou automações para extração massiva de dados;</li>
                                    <li>Burlar controles de acesso, limites de consultas (rate limits), paywalls ou medidas de segurança;</li>
                                    <li>Inserir vírus, executar ataques (incluindo DDoS) ou interferir no funcionamento;</li>
                                    <li>Usar a Plataforma para criar base concorrente, espelhar conteúdo, ou treinar/abastecer soluções concorrentes por meio de extração sistemática.</li>
                                </ul>
                                <p>5.3. O TributeiClass poderá aplicar limites de uso (rate limits) e medidas de proteção para garantir disponibilidade, segurança e estabilidade.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">6. Assinaturas, pagamentos, renovação e reembolso (Stripe)</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>6.1. O acesso a determinados recursos pode depender de Assinatura. Os Planos, preços e condições estarão descritos na página de Planos e/ou no checkout.</p>
                                <p>6.2. Pagamentos são processados via Stripe. Ao contratar, o Usuário concorda com as condições de cobrança do Plano e com os termos aplicáveis do provedor de pagamento.</p>
                                <p>6.3. Renovação automática: salvo indicação em contrário no momento da contratação, a assinatura poderá renovar automaticamente ao final de cada ciclo (mensal/anual). O Usuário pode cancelar para interromper renovações futuras.</p>
                                <p>6.4. Cancelamento: o Usuário pode solicitar cancelamento conforme instruções na Plataforma. Em regra, o cancelamento impede cobranças futuras, e o acesso pode permanecer até o fim do período já pago (quando aplicável).</p>
                                <p>6.5. Reembolso em 7 dias: caso o Usuário cancele o Plano em até 7 (sete) dias contados da contratação inicial (ou da primeira cobrança do ciclo, quando aplicável), o TributeiClass realizará o reembolso e/ou anulação da cobrança em até 7 (sete) dias após a confirmação do cancelamento, utilizando o mesmo meio de pagamento, observadas as regras operacionais da Stripe e do emissor do cartão.</p>
                                <p>6.6. Falha/atraso de pagamento (inadimplência): em caso de falha ou atraso no pagamento, o TributeiClass poderá suspender ou limitar o acesso até a regularização.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">7. Propriedade intelectual</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>7.1. A Plataforma, marca, layout, banco de dados, funcionalidades, algoritmos, modelos, textos e demais componentes são de propriedade do TributeiClass ou licenciados a ele e são protegidos por leis de propriedade intelectual.</p>
                                <p>7.2. Concedemos ao Usuário uma licença limitada, revogável, não exclusiva e intransferível para acessar e utilizar a Plataforma conforme estes Termos.</p>
                                <p>7.3. O Usuário pode utilizar os resultados/relatórios gerados pela Plataforma para fins internos, respeitando o Plano contratado e sem violar restrições de reprodução massiva ou redistribuição.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">8. Conteúdo do usuário e histórico de consultas</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>8.1. A Plataforma pode armazenar o histórico de consultas e uso do Usuário para permitir funcionalidades (como histórico, auditoria, segurança e melhoria do produto), conforme descrito na Política de Privacidade.</p>
                                <p>8.2. O Usuário declara possuir autorização e base legal para inserir quaisquer dados de terceiros que eventualmente inclua na Plataforma, responsabilizando-se por isso.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">9. Privacidade e proteção de dados (LGPD)</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                O tratamento de dados pessoais é regido pela Política de Privacidade do TributeiClass. Ao utilizar a Plataforma, você declara ciência e concordância com as práticas descritas nela.
                            </p>
                            <p className="text-slate-600 text-sm font-bold mt-2">Contato de privacidade: suporte@tributeiclass.com.br</p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">10. Disponibilidade, atualizações e suporte</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>10.1. Buscamos manter a Plataforma disponível, mas não garantimos funcionamento ininterrupto. Podem ocorrer interrupções por manutenção, atualizações, falhas de terceiros, ou eventos fora do nosso controle.</p>
                                <p>10.2. Podemos alterar, atualizar, suspender ou descontinuar funcionalidades para evolução do produto, segurança, conformidade legal ou adequação técnica.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">11. Limitação de responsabilidade</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>11.1. Na extensão máxima permitida pela lei, o TributeiClass não se responsabiliza por:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Decisões tomadas pelo Usuário com base no Conteúdo da Plataforma;</li>
                                    <li>Perdas indiretas, lucros cessantes, perda de receita, perda de dados, ou danos reputacionais;</li>
                                    <li>Inconsistências decorrentes de alterações legislativas, regulamentares ou interpretações;</li>
                                    <li>Falhas de integrações e serviços de terceiros (incluindo provedores de pagamento, analytics e infraestrutura).</li>
                                </ul>
                                <p>11.2. Quando aplicável e permitido por lei, a responsabilidade total do TributeiClass ficará limitada ao valor efetivamente pago pelo Usuário ao TributeiClass nos últimos 3 (três) meses anteriores ao evento que gerou o dano.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">12. Suspensão e encerramento de conta</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>12.1. Podemos suspender ou encerrar o acesso do Usuário em caso de violação destes Termos, suspeita de fraude, risco de segurança, determinação legal ou uso que comprometa a Plataforma.</p>
                                <p>12.2. O Usuário pode encerrar sua Conta a qualquer momento conforme instruções na Plataforma. Certos dados podem ser mantidos por prazo necessário para obrigações legais, segurança e prevenção a fraudes, conforme Política de Privacidade.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">13. Comunicações</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Podemos enviar comunicações operacionais (segurança, confirmações e avisos importantes). Comunicações promocionais serão enviadas quando aplicável e com opção de descadastro, conforme legislação.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">14. Alterações destes Termos</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Estes Termos podem ser atualizados periodicamente. A versão vigente ficará disponível na Plataforma. O uso continuado após a publicação de alterações indica concordância.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">15. Lei aplicável e foro</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Uberlândia/MG, com renúncia a qualquer outro, salvo disposição legal em contrário.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">16. Contato</h2>
                            <div className="text-slate-600 text-sm space-y-1">
                                <p><strong>E-mail:</strong> suporte@tributeiclass.com.br</p>
                                <p><strong>Site:</strong> <a href="https://tributeiclass.com.br" className="text-brand-600 hover:underline">https://tributeiclass.com.br</a></p>
                            </div>
                        </section>

                        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                            <button
                                onClick={() => onNavigate('landing')}
                                className="text-brand-600 font-bold text-sm hover:underline flex items-center gap-2"
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
    );
};

export default Terms;
