
import React, { useState, useEffect } from 'react';

const GTM_ID = 'GTM-WW2J3Z4Z';

// Function to load GTM
const loadGTM = (id: string) => {
    if (window.document.getElementById('gtm-script')) return;

    const script = window.document.createElement('script');
    script.id = 'gtm-script';
    script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${id}');
  `;
    window.document.head.appendChild(script);
};

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [analyticsConsent, setAnalyticsConsent] = useState(false);

    useEffect(() => {
        const handleShowConsent = () => {
            setIsVisible(true);
            setShowPreferences(true);
        };

        window.addEventListener('show-cookie-consent', handleShowConsent);

        const consentRaw = localStorage.getItem('tc_cookie_consent_v1');
        if (!consentRaw) {
            setIsVisible(true);
        } else {
            try {
                const consent = JSON.parse(consentRaw);
                if (consent.analytics === 'granted' || consent.status === 'granted') {
                    loadGTM(GTM_ID);
                    setAnalyticsConsent(true);
                }
            } catch (e) {
                setIsVisible(true);
            }
        }

        return () => window.removeEventListener('show-cookie-consent', handleShowConsent);
    }, []);

    const saveConsent = (status: 'granted' | 'declined', analytics: boolean) => {
        const consentData = {
            status,
            analytics: analytics ? 'granted' : 'declined',
            timestamp: new Date().toISOString(),
            version: '1.0',
            userAgent: navigator.userAgent
        };
        localStorage.setItem('tc_cookie_consent_v1', JSON.stringify(consentData));

        if (analytics || status === 'granted') {
            loadGTM(GTM_ID);
        }

        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        setAnalyticsConsent(true);
        saveConsent('granted', true);
    };

    const handleDeclineAll = () => {
        setAnalyticsConsent(false);
        saveConsent('declined', false);
    };

    const handleSavePreferences = () => {
        saveConsent(analyticsConsent ? 'granted' : 'declined', analyticsConsent);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 md:p-8 overflow-hidden relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                    {!showPreferences ? (
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="bg-brand-50 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 animate-bounce">
                                    <i className="fa-solid fa-cookie-bite text-brand-600 text-2xl"></i>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-lg font-black text-slate-900 mb-2">Respeitamos sua privacidade</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
                                        Utilizamos cookies e tecnologias semelhantes para melhorar a sua experiência, analisar o desempenho do site e personalizar anúncios. Você pode aceitar todos os cookies ou configurar suas preferências.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowPreferences(true)}
                                        className="px-6 py-3 text-slate-600 font-bold text-xs uppercase tracking-widest hover:text-brand-600 transition-colors"
                                    >
                                        Preferências
                                    </button>
                                    <button
                                        onClick={handleDeclineAll}
                                        className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Apenas Essenciais
                                    </button>
                                    <button
                                        onClick={handleAcceptAll}
                                        className="px-8 py-3 bg-brand-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-200 hover:shadow-xl transition-all active:scale-95"
                                    >
                                        Aceitar Todos
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 animate-slide-up">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Gerenciar Preferências</h3>
                                <button
                                    onClick={() => setShowPreferences(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {/* Essential */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">Cookies Essenciais</h4>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Sempre Ativo</p>
                                    </div>
                                    <div className="w-12 h-6 bg-brand-500 rounded-full relative opacity-50 cursor-not-allowed">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                    </div>
                                </div>

                                {/* Analytics */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">Cookies Analíticos</h4>
                                        <p className="text-slate-500 text-xs">Nos permitem medir o tráfego e ver quais partes do site são mais populares.</p>
                                    </div>
                                    <button
                                        onClick={() => setAnalyticsConsent(!analyticsConsent)}
                                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${analyticsConsent ? 'bg-brand-600 shadow-md shadow-brand-100' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${analyticsConsent ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 -mx-8 -mb-8 p-6 px-8 mt-6">
                                <button
                                    onClick={() => setShowPreferences(false)}
                                    className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSavePreferences}
                                    className="px-10 py-3 bg-brand-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all active:scale-95"
                                >
                                    Salvar Preferências
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
