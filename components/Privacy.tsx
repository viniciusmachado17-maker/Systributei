
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
                    <div className="bg-emerald-600 p-8 md:p-12 text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">Política de Privacidade</h1>
                            <p className="text-emerald-100 font-medium">Última atualização: 15 de Fevereiro de 2026</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed mb-8">
                            O TributeiClass valoriza a sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos os seus dados pessoais ao utilizar nossa plataforma. Ao acessar o TributeiClass, você concorda com as práticas descritas aqui.
                        </p>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">1. Dados que coletamos</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>Coletamos informações necessárias para a prestação dos nossos serviços:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Informações de Cadastro:</strong> Nome, e-mail, telefone, CPF/CNPJ, senha (criptografada) e dados da empresa.</li>
                                    <li><strong>Dados de Pagamento:</strong> Processados de forma segura via Stripe. O TributeiClass não armazena o número completo do seu cartão de crédito.</li>
                                    <li><strong>Dados de Uso:</strong> Histórico de consultas, logs de acesso, endereço IP, tipo de navegador, dispositivo e interações com a plataforma.</li>
                                    <li><strong>Arquivos e Documentos:</strong> Planilhas e arquivos XML enviados para processamento em lote.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">2. Finalidade do tratamento</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>Utilizamos os dados para:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Prover as funcionalidades de consulta e classificação tributária;</li>
                                    <li>Processar pagamentos e gerenciar assinaturas;</li>
                                    <li>Garantir a segurança da conta e prevenir fraudes;</li>
                                    <li>Enviar comunicações transacionais (confirmação de pagamento, alertas de uso) e suporte técnico;</li>
                                    <li>Cumprir obrigações legais e regulatórias;</li>
                                    <li>Melhorar continuamente a experiência do usuário e a precisão do nosso sistema.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">3. Compartilhamento de dados</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>Não vendemos seus dados. O compartilhamento ocorre apenas com:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Stripe:</strong> para processamento de pagamentos.</li>
                                    <li><strong>Supabase:</strong> para armazenamento de dados e autenticação segura.</li>
                                    <li><strong>Autoridades:</strong> quando houver obrigação legal ou ordem judicial.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">4. Segurança e Armazenamento</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia SSL, autenticação robusta via Supabase e monitoramento constante. Os dados são armazenados em servidores de nuvem de alta confiabilidade.</p>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">5. Seus Direitos (LGPD)</h2>
                            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                                <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Confirmar a existência de tratamento de dados;</li>
                                    <li>Acessar seus dados;</li>
                                    <li>Corrigir dados incompletos ou inexatos;</li>
                                    <li>Solicitar a exclusão de dados desnecessários ou tratados em desconformidade;</li>
                                    <li>Revogar o consentimento a qualquer momento.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">6. Cookies</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Utilizamos cookies essenciais para o funcionamento da plataforma (sessão e segurança) e cookies analíticos para entender como os usuários interagem com nosso site. Você pode gerenciar as preferências de cookies no seu navegador.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">7. Alterações nesta Política</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas enviando um e-mail para o endereço cadastrado ou exibindo um aviso em nossa plataforma.
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
                                TributeiClass - Privacidade & Segurança<br />
                                suporte@tributeiclass.com.br
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
