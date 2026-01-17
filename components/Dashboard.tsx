
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { readBarcodesFromImageData, type BarcodeFormat } from 'zxing-wasm';
import Logo from './Logo';
import { SearchMode, Product, TaxBreakdown, ProductSummary } from '../types';
import { findProduct, calculateTaxes, searchProducts, getProductDetails } from '../services/taxService';
import { explainTaxRule, extractBarcodeFromImage } from '../services/geminiService';
import { supabase, testSupabaseConnection, isSupabaseConfigured, incrementUsage, createProductRequest, sendEmailConsultation, getAllConsultations, getUserConsultations, updateConsultationStatus, getOrganization, getProductRequests, updateProductRequestStatus, getUserProductRequests, saveSearchHistory, getSearchHistory, clearUserSearchHistory, getDemoRequests, updateDemoRequestStatus, markRequestsAsSeen, markConsultationsAsSeen } from '../services/supabaseClient';
import insightsData from '../deps/cclasstrib_insights.json';
import insightsSimplificado from '../deps/cclasstrib_simplificado.json';
import { UserProfile } from '../App';
import XMLAnalysis from './XMLAnalysis';
import { Package, Calculator, History, MessageSquare, Settings, FileSpreadsheet } from 'lucide-react';

interface DashboardProps {
  user: UserProfile | null;
  onLogout: () => void;
  onNavigate: (view: any) => void;
}

type DashboardTab = 'search' | 'history' | 'consultancy' | 'settings' | 'batch';

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('search');
  const [mode, setMode] = useState<SearchMode>('barcode');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false); // Renamed from isLoading
  const [product, setProduct] = useState<Product | null>(null);
  const [taxes, setTaxes] = useState<TaxBreakdown | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Organization Data State - START
  const [organizationData, setOrganizationData] = useState(user?.organization);

  // Fetch Organization Data on Mount
  useEffect(() => {
    if (user?.organization?.id) {
      const fetchOrgData = async () => {
        try {
          const data = await getOrganization(user.organization!.id);
          if (data) {
            setOrganizationData(prev => prev ? ({ ...prev, ...data }) : data);
          }
        } catch (error) {
          console.error("Error fetching organization data:", error);
        }
      };
      fetchOrgData();
    }
  }, [user?.organization?.id]);
  // Organization Data State - END

  // Trial Expiration Logic
  const isTrialExpired = () => {
    const org = organizationData || user?.organization;
    if (!org || org.plan_type !== 'gratis') return false;

    const endsAt = org.trial_ends_at
      ? new Date(org.trial_ends_at)
      : (org.created_at ? new Date(new Date(org.created_at).getTime() + 7 * 24 * 60 * 60 * 1000) : null);

    if (!endsAt) return false;
    return endsAt < new Date();
  };

  const isSubscriptionInactive = () => {
    const org = organizationData || user?.organization;
    // Se for grátis, não bloqueia por status (ja tem o trial)
    if (!org || org.plan_type === 'gratis') return false;

    // Bloqueia se o status for qualquer um diferente de 'active' ou se estiver nulo (assinante sem status ativo)
    const inactiveStatuses = ['past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'];
    return org.subscription_status ? inactiveStatuses.includes(org.subscription_status) : false;
  };

  // Auto-check trial and subscription on mount or tab change
  useEffect(() => {
    if (isTrialExpired()) {
      setUpgradeReason('trial');
      setIsUpgradeModalOpen(true);
    } else if (isSubscriptionInactive()) {
      setUpgradeReason('payment_failed');
      setIsUpgradeModalOpen(true);
    } else {
      // Se estiver tudo ok, garante que o modal fecha (importante quando os dados carregam)
      setIsUpgradeModalOpen(false);
    }
  }, [activeTab, organizationData?.id, organizationData?.subscription_status]);

  // Safe Rejection State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // User Request View State
  const [userConsultancyView, setUserConsultancyView] = useState<'consultas' | 'requests'>('consultas');
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isUserRequestsLoading, setIsUserRequestsLoading] = useState(false);

  // Fetch User Requests
  useEffect(() => {
    if (user && activeTab === 'consultancy' && userConsultancyView === 'requests') {
      const fetchUserRequests = async () => {
        setIsUserRequestsLoading(true);
        const data = await getUserProductRequests(user.id);
        setUserRequests(data);
        setIsUserRequestsLoading(false);
      };
      fetchUserRequests();
    }
  }, [user, activeTab, userConsultancyView]);

  // Load history from Supabase on mount
  const [history, setHistory] = useState<Product[]>([]);

  // Initialize history from Supabase when user is available
  useEffect(() => {
    if (user?.id) {
      const fetchHistory = async () => {
        const data = await getSearchHistory(user.id);
        setHistory(data);
      };
      fetchHistory();
    }
  }, [user?.id]);

  const [error, setError] = useState(''); // Added error state

  // Estados de Conexão
  const [connStatus, setConnStatus] = useState<'testing' | 'online' | 'offline' | 'mock'>('testing');
  const [connMessage, setConnMessage] = useState('');

  // States for Multi-step Search
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);

  const [secondaryFilter, setSecondaryFilter] = useState('');

  // States for Product Request
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [notFoundTerm, setNotFoundTerm] = useState('');
  const [requestObs, setRequestObs] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'trial' | 'usage' | 'history' | 'email' | 'whatsapp' | 'payment_failed' | 'request'>('usage');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Consulta por E-mail States
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [adminConsultations, setAdminConsultations] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Estados para contadores de pendências (Badges)
  const [pendingCounts, setPendingCounts] = useState({ requests: 0, consultations: 0, demos: 0 });

  // Função para buscar contadores de pendências (reutilizável)
  const refreshPendingCounts = useCallback(async () => {
    if (!user) return;
    try {
      let reqCount = 0;
      let consultCount = 0;

      if (user.role === 'admin') {
        const [reqs, consults, demos] = await Promise.all([
          getProductRequests(),
          getAllConsultations(),
          getDemoRequests()
        ]);
        reqCount = reqs.filter(r => r.status === 'pending').length;
        consultCount = consults.filter(c => c.status === 'pending').length;
        const demoCount = demos.filter(d => d.status === 'pending').length;
        setPendingCounts({ requests: reqCount, consultations: consultCount, demos: demoCount });
      } else {
        const [reqs, consults] = await Promise.all([
          getUserProductRequests(user.id),
          getUserConsultations(user.organization?.id || '')
        ]);
        // Para o usuário final, as "notificações" são itens que o admin mexeu e ele ainda não viu
        reqCount = reqs.filter(r => !r.user_seen).length;
        consultCount = consults.filter(c => !c.user_seen).length;
        setPendingCounts({ requests: reqCount, consultations: consultCount, demos: 0 });
      }
    } catch (e) {
      console.error("Error fetching pending counts:", e);
    }
  }, [user]);

  // Buscar contadores de pendências ao montar ou alterar usuário/tab
  useEffect(() => {
    if (user) {
      refreshPendingCounts();
    }
  }, [user, user?.organization?.id, refreshPendingCounts]);

  // Efeito para marcar como visto quando o usuário navega nas abas de pedido/consultoria
  useEffect(() => {
    if (user && user.role !== 'admin' && activeTab === 'consultancy') {
      if (userConsultancyView === 'requests' && pendingCounts.requests > 0) {
        console.log("Marking requests as seen for user", user.id);
        // Instant update local
        setPendingCounts(prev => ({ ...prev, requests: 0 }));
        setUserRequests(prev => prev.map(r => ({ ...r, user_seen: true })));

        // Async update server (fire and forget for UI purposes)
        markRequestsAsSeen(user.id);
      } else if (userConsultancyView === 'consultas' && pendingCounts.consultations > 0) {
        console.log("Marking consultations as seen for user", user.id);
        // Instant update local
        setPendingCounts(prev => ({ ...prev, consultations: 0 }));
        setAdminConsultations(prev => prev.map(c => ({ ...c, user_seen: true })));

        // Async update server (fire and forget for UI purposes)
        markConsultationsAsSeen(user.id);
      }
    }
  }, [user, activeTab, userConsultancyView, pendingCounts.requests, pendingCounts.consultations]);

  // Detectar se é iOS para desativar funções problemáticas (tela branca)
  const isIOS = useMemo(() => {
    // Detecta iPhone, iPad e iPod, inclusive iPads mais novos que se identificam como Macintosh mas possuem touch
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>();

  const startIOSScanner = useCallback(async () => {
    if (!isScannerOpen || !isIOS) return;
    setScannerError(null);

    try {
      console.log("Starting iOS Specific Scanner...");
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
      }

      let lastMatch = "";
      let matchCount = 0;

      const scanFrame = async () => {
        if (!isScannerOpen || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false, style: 'image-rendering: pixelated' });

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Crop focado no centro (onde está o guia visual)
          const sw = video.videoWidth * 0.8;
          const sh = video.videoHeight * 0.3;
          const sx = (video.videoWidth - sw) / 2;
          const sy = (video.videoHeight - sh) / 2;

          canvas.width = sw;
          canvas.height = sh;
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

          try {
            const imageData = ctx.getImageData(0, 0, sw, sh);
            const formats: BarcodeFormat[] = ['EAN-13', 'EAN-8', 'Code128', 'UPC-A', 'UPC-E'];
            const results = await readBarcodesFromImageData(imageData, {
              formats,
              tryInvert: true,
              tryRotate: true
            });

            if (results.length > 0) {
              const text = results[0].text;
              if (text === lastMatch) {
                matchCount++;
              } else {
                lastMatch = text;
                matchCount = 1;
              }

              if (matchCount >= 2) {
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(t => t.stop());
                  streamRef.current = null;
                }
                setIsScannerOpen(false);
                setQuery(text);
                handleSearch(undefined, undefined, text);
                return;
              }
            } else {
              matchCount = 0;
            }
          } catch (e) { }
        }
        requestRef.current = requestAnimationFrame(scanFrame);
      };

      requestRef.current = requestAnimationFrame(scanFrame);

    } catch (err: any) {
      console.error("IOS Scanner Error:", err);
      setScannerError("Permita o acesso à câmera para escanear.");
    }
  }, [isScannerOpen, isIOS]);

  const startScanner = useCallback(async () => {
    if (isIOS) return startIOSScanner();
    if (!isScannerOpen) return;

    setScannerError(null);
    const qrCodeSuccessCallback = async (decodedText: string) => {
      // 1. Para imediatamente para liberar a câmera e evitar sobrecarga de GPU/CPU que causa o travamento
      if (scannerRef.current?.isScanning) {
        try { await scannerRef.current.stop(); } catch (e) { }
      }
      setIsScannerOpen(false);
      setQuery(decodedText);
      // 2. Dispara a busca automaticamente com o código lido
      handleSearch(undefined, undefined, decodedText);
    };

    try {
      const readerElement = document.getElementById("reader");
      if (!readerElement) return;

      const config = {
        fps: 30,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.floor(viewfinderWidth * 0.85);
          const height = Math.floor(width * 0.45);
          return { width, height };
        },
      };

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false
        });
      }

      const constraints = {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        advanced: [{ focusMode: "continuous" }] as any
      };

      // Tenta parar se já estiver rodando por segurança
      try { await scannerRef.current.stop(); } catch (e) { }

      await scannerRef.current.start(
        { facingMode: "environment" },
        { ...config, videoConstraints: constraints },
        qrCodeSuccessCallback,
        undefined
      );

      // Lanterna
      setTimeout(async () => {
        try {
          const tracks = scannerRef.current?.getRunningTrack();
          const capabilities = tracks ? (tracks as any).getCapabilities() : {};
          if (capabilities.torch) setHasTorch(true);
        } catch (err) { }
      }, 1000);

    } catch (err: any) {
      console.error("Scanner Error:", err);
      setScannerError("Não foi possível iniciar a câmera.");
    }
  }, [isScannerOpen]);



  useEffect(() => {
    if (isScannerOpen) {
      startScanner();
    } else {
      // Cleanup para iOS
      if (isIOS) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      }

      // Cleanup para Android/Standard
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => { });
        }
        scannerRef.current = null;
      }
      setHasTorch(false);
      setIsTorchOn(false);
      setScannerError(null);
    }

    return () => {
      if (isIOS) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      } else {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => { });
        }
      }
    };
  }, [isScannerOpen, startScanner, isIOS]);

  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState<string | null>(null);
  const [adminReplyMap, setAdminReplyMap] = useState<Record<string, string>>({});
  const [userClarificationMap, setUserClarificationMap] = useState<Record<string, string>>({});
  const [adminTab, setAdminTab] = useState<'pending' | 'finished'>('pending');

  // Admin View State
  const [adminViewMode, setAdminViewMode] = useState<'consultas' | 'requests' | 'demos'>('consultas');
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [adminDemos, setAdminDemos] = useState<any[]>([]);
  const [isRequestActionLoading, setIsRequestActionLoading] = useState<string | null>(null);

  // Fetch Requests
  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'consultancy') {
      if (adminViewMode === 'requests') {
        const fetchRequests = async () => {
          setIsAdminLoading(true);
          const data = await getProductRequests();
          setAdminRequests(data);
          setIsAdminLoading(false);
        };
        fetchRequests();
      } else if (adminViewMode === 'demos') {
        const fetchDemos = async () => {
          setIsAdminLoading(true);
          const data = await getDemoRequests();
          setAdminDemos(data);
          setIsAdminLoading(false);
        };
        fetchDemos();
      }
    }
  }, [user?.role, activeTab, adminViewMode]);

  const handleDemoAction = async (id: string, status: 'contacted' | 'completed' | 'rejected') => {
    setIsAdminActionLoading(id);
    const success = await updateDemoRequestStatus(id, status);
    if (success) {
      alert("Status atualizado!");
      setAdminDemos(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      refreshPendingCounts();
    } else {
      alert("Erro ao atualizar!");
    }
    setIsAdminActionLoading(null);
  };

  const handleRequestAction = async (id: string, status: 'completed' | 'rejected') => {
    setIsRequestActionLoading(id);
    const success = await updateProductRequestStatus(id, status);
    if (success) {
      alert("Status atualizado com sucesso!");
      setAdminRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
      refreshPendingCounts();
    } else {
      alert("Erro ao atualizar status.");
    }
    setIsRequestActionLoading(null);
  };

  const handleCancelSubscription = async () => {
    if (!user?.organization?.id) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: { orgId: user.organization.id }
      });
      if (error) throw error;
      alert("Seu cancelamento foi agendado com sucesso. Você terá acesso até o fim do período atual.");
      setIsCancelModalOpen(false);

      // Atualização otimista da UI
      setOrganizationData(prev => prev ? { ...prev, cancel_at_period_end: true } : null);

      // Recarrega dados da org (mantendo o estado otimista se o banco ainda não sincronizou)
      const data = await getOrganization(user.organization.id);
      if (data) {
        setOrganizationData(prev => ({
          ...data,
          cancel_at_period_end: prev?.cancel_at_period_end || data.cancel_at_period_end
        }));
      }
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectTargetId(id);
    setConfirmationText('');
    setRejectModalOpen(true);
  };

  const confirmRejection = async () => {
    if (confirmationText.toUpperCase() !== 'SIM' || !rejectTargetId) return;

    setRejectModalOpen(false);
    await handleRequestAction(rejectTargetId, 'rejected');
    setRejectTargetId(null);
  };

  useEffect(() => {
    const checkConn = async () => {
      if (!isSupabaseConfigured) {
        setConnStatus('mock');
        setConnMessage("Configure as chaves SUPABASE_URL e SUPABASE_ANON_KEY.");
        return;
      }
      const result = await testSupabaseConnection();
      setConnStatus(result.success ? 'online' : 'offline');
      setConnMessage(result.message);
    };
    checkConn();
  }, []);

  useEffect(() => {
    if (activeTab === 'consultancy' && user && user.organization) {
      const fetchData = async () => {
        setIsAdminLoading(true);

        // Sincronizar limites da organização
        const latestOrg = await getOrganization(user.organization!.id);
        if (latestOrg && user.organization) {
          user.organization.email_count = latestOrg.email_count;
          user.organization.email_limit = latestOrg.email_limit;
          user.organization.usage_count = latestOrg.usage_count;
          user.organization.usage_limit = latestOrg.usage_limit;
          user.organization.request_count = latestOrg.request_count;
          user.organization.request_limit = latestOrg.request_limit;
        }

        if (user.role === 'admin') {
          console.log("Fetching as admin...");
          const data = await getAllConsultations();
          console.log("Admin data received:", data);
          setAdminConsultations(data);
        } else if (user.organization) {
          console.log("Fetching as user for org:", user.organization.id);
          const data = await getUserConsultations(user.organization.id);
          console.log("User data received:", data);
          setAdminConsultations(data);
        }
        setIsAdminLoading(false);
      };
      fetchData();
    }
  }, [activeTab, user?.role, user?.organization?.id]);

  // Scroll automático quando o modal de seleção abre/fecha
  useEffect(() => {
    if (isSelectionOpen) {
      // Quando o modal abre, rola suavemente para o topo para mostrar o formulário
      const mainContent = document.querySelector('.flex-grow.overflow-y-auto');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [isSelectionOpen]);

  // Limpar resultados quando mudar de aba
  useEffect(() => {
    if (activeTab !== 'search') {
      setProduct(null);
      setTaxes(null);
      setQuery('');
      setSearchResults([]);
      setIsSelectionOpen(false);
    }
  }, [activeTab]);

  const processProductData = async (data: Product) => {
    setProduct(data);
    const calculatedTaxes = calculateTaxes(data);
    setTaxes(calculatedTaxes);

    setHistory(prev => {
      // Prevent duplicates
      const filtered = prev.filter(p => p.ean !== data.ean);
      const newHistory = [data, ...filtered];
      // Limit to 5 items
      return newHistory.slice(0, 5);
    });

    // Salvar no Histórico do Supabase
    if (user?.id && user?.organization?.id) {
      saveSearchHistory(user.id, user.organization.id, data);
    }


    setIsExplaining(true);


    // Buscar insight simplificado em primeiro lugar
    const db_cclass = calculatedTaxes.cClass_ibs || calculatedTaxes.cClass_cbs;
    const simpleInsight = (insightsSimplificado as any[]).find(item =>
      String(item.cClass) === String(db_cclass) ||
      String(item.cClass) === String(db_cclass).replace(/\./g, '')
    );

    if (simpleInsight) {
      setExplanation(null);
      setIsExplaining(false);
    } else {
      // Fallback para insight mais detalhado ou IA
      const staticInsight = (insightsData as any[]).find(item =>
        String(item.cClass) === String(db_cclass) ||
        String(item.cClass) === String(db_cclass).replace(/\./g, '')
      );

      if (staticInsight) {
        setExplanation(staticInsight.insight);
        setIsExplaining(false);
      } else {
        const aiText = await explainTaxRule(data.produtos, data.category, data.ncm, calculatedTaxes);
        setExplanation(aiText);
        setIsExplaining(false);
      }
    }
  };

  // Função para visualizar item do histórico sem fazer nova busca
  const handleHistoryClick = (item: Product) => {
    setProduct(item);
    const calculatedTaxes = calculateTaxes(item);
    setTaxes(calculatedTaxes);
    setActiveTab('search');


    // Gerar explicação (Prioriza Simplificado > Detalhado > IA)
    setIsExplaining(true);
    const db_cclass = calculatedTaxes.cClass_ibs || calculatedTaxes.cClass_cbs;

    const simpleInsight = (insightsSimplificado as any[]).find(item =>
      String(item.cClass) === String(db_cclass) ||
      String(item.cClass) === String(db_cclass).replace(/\./g, '')
    );

    if (simpleInsight) {
      setExplanation(null);
      setIsExplaining(false);
    } else {
      const staticInsight = (insightsData as any[]).find(item =>
        String(item.cClass) === String(db_cclass) ||
        String(item.cClass) === String(db_cclass).replace(/\./g, '')
      );

      if (staticInsight) {
        setExplanation(staticInsight.insight);
        setIsExplaining(false);
      } else {
        explainTaxRule(item.produtos, item.category, item.ncm, calculatedTaxes).then(aiText => {
          setExplanation(aiText);
          setIsExplaining(false);
        });
      }
    }
  };

  const handleClearHistory = async () => {
    if (!user?.id) return;
    if (confirm("Deseja realmente limpar todo o seu histórico de buscas?")) {
      const success = await clearUserSearchHistory(user.id);
      if (success) {
        setHistory([]);
      }
    }
  };

  const loadProductDetails = async (id: number, consumeQuota: boolean = true) => {
    try {
      setError('');
      setLoading(true);
      setIsSelectionOpen(false); // Close modal
      const data = await getProductDetails(id); // Assuming getProductDetails takes only id
      if (data) {
        // Se deve consumir cota e usuário tem organização
        if (consumeQuota && user?.organization) {
          // Verifica limite (opcional, pois já verificou no inicio, mas bom ter redundância)
          if (user.organization.usage_count < user.organization.usage_limit || user.organization.plan_type === 'enterprise') {
            await incrementUsage(user.organization.id);
            // Atualizar estado local para refletir no header
            setOrganizationData(prev => prev ? ({ ...prev, usage_count: prev.usage_count + 1 }) : prev);
            // Manter compatibilidade com objeto user se necessário (mas o header usa organizationData agora)
            if (user.organization) user.organization.usage_count += 1;
          }
        }
        await processProductData(data);
      } else {
        setError('Detalhes do produto não encontrados.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, itemToLoad?: Product, directQuery?: string) => {
    e?.preventDefault(); // Prevent default form submission if event is passed

    // Se passar um item direto (clique no histórico), carrega ele SEM consumir cota
    if (itemToLoad) {
      await loadProductDetails(itemToLoad.id, false);
      setActiveTab('search');
      return;
    }

    const searchQuery = (directQuery || query).trim();
    if (!searchQuery) return;

    setLoading(true);
    setError('');
    setProduct(null);
    setTaxes(null);
    setExplanation(null);
    setSearchResults([]);
    setIsSelectionOpen(false);
    setSecondaryFilter('');

    try {
      // 1. Verificar Limite de Uso
      if (user?.organization) {
        const { usage_count, usage_limit, plan_type, trial_ends_at } = user.organization;

        // Verificar Expiração de Trial
        if (isTrialExpired()) {
          setUpgradeReason('trial');
          setIsUpgradeModalOpen(true);
          setLoading(false);
          return;
        }

        // Verificar Assinatura Inativa
        if (isSubscriptionInactive()) {
          setUpgradeReason('payment_failed');
          setIsUpgradeModalOpen(true);
          setLoading(false);
          return;
        }

        // Verificar Cota de Uso (Ilimitado para Pro, Premium e Enterprise)
        const isUnlimited = ['pro', 'premium', 'enterprise'].includes(plan_type);
        if (!isUnlimited && usage_count >= usage_limit) {
          setUpgradeReason('usage');
          setIsUpgradeModalOpen(true);
          setLoading(false);
          return;
        }
      }

      // 2. Lógica de Busca por Etapas
      if (mode === 'name' || mode === 'ncm') {
        const results = await searchProducts(searchQuery, mode === 'ncm' ? 'ncm' : 'name');

        if (results.length === 0) {
          setNotFoundTerm(searchQuery);
          // Abre modal de solicitação se estiver online
          if (connStatus === 'online') {
            // Sincronizar limites antes de abrir o modal para garantir precisão
            const latestOrg = await getOrganization(user.organization!.id);
            if (latestOrg && user.organization) {
              user.organization.email_count = latestOrg.email_count;
              user.organization.email_limit = latestOrg.email_limit;
              user.organization.usage_count = latestOrg.usage_count;
              user.organization.usage_limit = latestOrg.usage_limit;
              user.organization.request_count = latestOrg.request_count;
              user.organization.request_limit = latestOrg.request_limit;
            }
            setIsRequestModalOpen(true);
          } else {
            alert('Produto não encontrado (Modo Demo).');
          }
        } else if (results.length === 1) {
          // Se só tem 1, já carrega direto
          await loadProductDetails(results[0].id);
        } else {
          // Se tem vários, ordena alfabeticamente e abre modal de seleção
          const sortedResults = [...results].sort((a, b) =>
            a.produto.localeCompare(b.produto)
          );
          setSearchResults(sortedResults);
          setIsSelectionOpen(true);
        }
      } else {
        // Busca direta (Barcode) - Tenta buscar detalhes direto
        // O findProduct atual já lida com 'barcode' chamando getProductDetails
        const found = await findProduct(searchQuery, mode);

        if (found) {
          await processProductData(found);
          // Incrementar uso aqui também, pois processProductData não incrementa
          if (user?.organization) {
            await incrementUsage(user.organization.id);
            setOrganizationData(prev => prev ? ({ ...prev, usage_count: prev.usage_count + 1 }) : prev);
            user.organization.usage_count += 1;
          }
        } else {
          if (connStatus === 'online') {
            setNotFoundTerm(searchQuery);
            // Sincronizar limites antes de abrir o modal
            const latestOrg = await getOrganization(user.organization!.id);
            if (latestOrg && user.organization) {
              user.organization.email_count = latestOrg.email_count;
              user.organization.email_limit = latestOrg.email_limit;
              user.organization.usage_count = latestOrg.usage_count;
              user.organization.usage_limit = latestOrg.usage_limit;
              user.organization.request_count = latestOrg.request_count;
              user.organization.request_limit = latestOrg.request_limit;
            }
            setIsRequestModalOpen(true);
          } else {
            alert("Produto não encontrado (Modo Demo). Use códigos do Hero.");
          }
        }
      }

    } catch (err) {
      console.error("Erro na consulta:", err);
      alert("Houve uma falha na comunicação com o banco de dados.");
    } finally {
      setLoading(false);
    }

  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.organization) return;

    // 0. Verificar Trial
    if (isTrialExpired()) {
      setUpgradeReason('trial');
      setIsUpgradeModalOpen(true);
      return;
    }

    // Verificar se atingiu limite
    const email_count = Number(user.organization.email_count || 0);
    const email_limit = Number(user.organization.email_limit || 0);
    const plan_type = user.organization.plan_type;
    const isUnlimited = ['premium', 'enterprise'].includes(plan_type);

    console.log("Checking limits:", { email_count, email_limit, isUnlimited });

    if (!isUnlimited && email_count >= email_limit) {
      setUpgradeReason('email');
      setIsUpgradeModalOpen(true);
      return;
    }

    setEmailLoading(true);
    setEmailSuccess(false);

    try {
      const res = await sendEmailConsultation({
        organization_id: user.organization.id,
        user_id: user.id,
        subject: emailSubject,
        message: emailMessage
      });

      if (res.success) {
        setEmailSuccess(true);
        setEmailSubject('');
        setEmailMessage('');
        // Atualizar estado local do contador
        user.organization.email_count += 1;
        refreshPendingCounts();
      } else {
        alert(res.message || "Erro ao enviar consulta.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha na conexão ao enviar e-mail.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleAdminAction = async (id: string, status: 'replied' | 'clarification') => {
    const currentConsult = adminConsultations.find(c => c.id === id);
    const answer = adminReplyMap[id] ?? currentConsult?.answer ?? '';

    if (status === 'replied' && !answer.trim()) {
      alert("Por favor, escreva uma resposta antes de marcar como respondida.");
      return;
    }

    console.log(`Admin action: ${status} for ID: ${id}`, { answer });
    setIsAdminActionLoading(id);

    try {
      const success = await updateConsultationStatus(
        id,
        status,
        status === 'replied' ? answer : undefined,
        undefined,
        status === 'clarification' ? answer : undefined
      );
      if (success) {
        alert("Ação realizada com sucesso!");
        // Atualizar lista local
        const now = new Date().toISOString();
        setAdminConsultations(prev => prev.map(c =>
          c.id === id ? {
            ...c,
            status,
            answer: status === 'replied' ? answer : c.answer,
            clarification_request: status === 'clarification' ? answer : c.clarification_request,
            updated_at: now,
            user_reply: c.user_reply
          } : c
        ));
        // Limpar campo de resposta se foi respondida
        if (status === 'replied') {
          setAdminReplyMap(prev => {
            const newMap = { ...prev };
            delete newMap[id];
            return newMap;
          });
        }
        refreshPendingCounts();
      } else {
        alert("Erro ao atualizar status da consulta no servidor.");
      }
    } catch (err) {
      console.error("Erro handleAdminAction:", err);
      alert("Erro inesperado ao processar ação.");
    } finally {
      setIsAdminActionLoading(null);
    }
  };

  const handleUserReply = async (id: string) => {
    const reply = userClarificationMap[id] || '';
    if (!reply.trim()) {
      alert("Por favor, descreva sua dúvida ou envie as informações solicitadas.");
      return;
    }

    const success = await updateConsultationStatus(id, 'pending', undefined, reply);
    if (success) {
      alert("Resposta enviada com sucesso! Aguarde o retorno do especialista.");
      // Atualizar lista local
      const now = new Date().toISOString();
      setAdminConsultations(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'pending', user_reply: reply, updated_at: now } : c
      ));
      // Limpar campo
      setUserClarificationMap(prev => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
      refreshPendingCounts();
    } else {
      alert("Erro ao enviar resposta.");
    }
  };

  const handleProductRequest = async () => {
    if (!user?.organization) return;

    // 0. Verificar Trial
    if (isTrialExpired()) {
      setIsRequestModalOpen(false);
      setUpgradeReason('trial');
      setIsUpgradeModalOpen(true);
      return;
    }

    // Validar limite de solicitações
    if (user.organization.request_count >= user.organization.request_limit) {
      setIsRequestModalOpen(false);
      setUpgradeReason('request');
      setIsUpgradeModalOpen(true);
      return;
    }

    setRequestLoading(true);
    const result = await createProductRequest({
      organization_id: user.organization.id,
      user_id: user.id,
      product_name: notFoundTerm,
      status: 'pending',
      observation: requestObs,
      ean: mode === 'barcode' ? notFoundTerm : undefined,
      ncm: mode === 'ncm' ? notFoundTerm : undefined
    });

    if (result.success) {
      alert('Solicitação enviada com sucesso! Nossa equipe irá analisar.');
      // Atualiza contador localmente
      if (user.organization) {
        user.organization.request_count += 1;
        setOrganizationData(prev => prev ? ({ ...prev, request_count: prev.request_count + 1 }) : prev);
      }
      setIsRequestModalOpen(false);
      setRequestObs('');
      refreshPendingCounts();
    } else {
      alert('Erro ao enviar solicitação: ' + result.message);
    }
    setRequestLoading(false);
  };

  const renderRequestModal = () => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="overflow-y-auto flex-grow no-scrollbar">
          <div className="p-8 text-center border-b border-slate-50">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-clipboard-question text-2xl text-orange-500"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800">Produto não encontrado</h3>
            <p className="text-sm text-slate-500 mt-2">
              Não localizamos <strong>"{notFoundTerm}"</strong> em nossa base.
              Deseja solicitar o cadastro deste item?
            </p>
          </div>

          <div className="p-8 space-y-4">
            <div className="bg-brand-50 p-4 rounded-xl flex justify-between items-center text-xs font-bold text-brand-700">
              <span>Solicitações Disponíveis</span>
              <span>{user?.organization ? user.organization.request_limit - user.organization.request_count : 0} restantes</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Observação (Opcional)</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 text-xs font-medium resize-none h-24"
                placeholder="Ex: Marca do produto, detalhes adicionais..."
                value={requestObs}
                onChange={(e) => setRequestObs(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={() => setIsRequestModalOpen(false)}
            className="flex-1 py-3.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-white transition text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleProductRequest}
            disabled={requestLoading}
            className="flex-1 py-3.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {requestLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Solicitar Cadastro'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSelectionModal = () => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-800">Selecione o Produto</h3>
            <p className="text-xs text-slate-500 font-medium">Encontramos {searchResults.length} itens correspondentes</p>
          </div>
          <button
            onClick={() => setIsSelectionOpen(false)}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
          {/* Refinamento de Busca (Server-Side) */}
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Refinar termo de busca (Nova consulta)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white shadow-sm"
                value={query}
                onChange={(e) => {
                  let val = e.target.value;
                  if (mode === 'barcode') {
                    val = val.replace(/\D/g, '').slice(0, 14);
                  } else if (mode === 'ncm') {
                    val = val.replace(/\D/g, '').slice(0, 8);
                  }
                  setQuery(val);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {(mode === 'barcode' || mode === 'ncm') && (
                <p className="text-[9px] text-brand-600 font-bold mt-1 ml-1 uppercase tracking-tighter">
                  <i className="fa-solid fa-circle-info mr-1"></i>
                  Apenas números são aceitos neste campo
                </p>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-4 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition shadow-sm"
            >
              <i className="fa-solid fa-rotate-right mr-2"></i>
              Buscar
            </button>
          </div>

          {/* Filtro Local (Client-Side) */}
          <div className="relative">
            <i className="fa-solid fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Filtrar nesta lista por NCM ou código..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-100/50"
              value={secondaryFilter}
              onChange={(e) => setSecondaryFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2 flex-grow">
          {searchResults
            .filter(item =>
              secondaryFilter === '' ||
              item.produto.toLowerCase().includes(secondaryFilter.toLowerCase()) ||
              (item.ncm && item.ncm.includes(secondaryFilter)) ||
              (item.ean && item.ean.includes(secondaryFilter))
            )
            .map((item) => (
              <button
                key={item.id}
                onClick={() => loadProductDetails(item.id)}
                className="w-full text-left bg-white p-4 rounded-xl border border-slate-100 hover:border-brand-500 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 uppercase pr-4">{item.produto}</h4>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">ID: {item.id}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <p className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">
                    <i className="fa-solid fa-barcode mr-1"></i> {item.ean || 'S/GTIN'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">
                    <i className="fa-solid fa-layer-group mr-1"></i> NCM: {item.ncm || '---'}
                  </p>
                  {item.cest && (
                    <p className="text-[10px] font-bold bg-brand-50 text-brand-600 px-2 py-1 rounded border border-brand-100">
                      <i className="fa-solid fa-hashtag mr-1"></i> CEST: {item.cest}
                    </p>
                  )}
                </div>
              </button>
            ))}

          {searchResults.filter(item =>
            secondaryFilter === '' ||
            item.produto.toLowerCase().includes(secondaryFilter.toLowerCase()) ||
            (item.ncm && item.ncm.includes(secondaryFilter)) ||
            (item.ean && item.ean.includes(secondaryFilter))
          ).length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 font-bold text-xs">Nenhum item corresponde ao filtro secundário.</p>
              </div>
            )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col items-center gap-3">
          <p className="text-[10px] text-slate-400">Clique no item correto para ver a tributação completa.</p>
          <button
            onClick={() => setIsSelectionOpen(false)}
            className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-700 transition text-xs"
          >
            Fechar Seleção
          </button>
        </div>
      </div>
    </div>
  ); const renderSearch = () => (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-slide-up">
      <div className={`space-y-4 md:space-y-6 transition-all duration-500 ${isSelectionOpen ? 'pt-96' : 'pt-0'}`}>
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Consulta de Produtos</h1>
          <p className="text-[13px] md:text-sm text-slate-500 font-medium">Insira o código de barras ou o nome do produto para classificar.</p>
        </div>




        {(connStatus === 'offline' || connStatus === 'mock') && (
          <p className="text-[11px] text-slate-500 mt-2 max-w-lg mx-auto">
            <i className="fa-solid fa-circle-info mr-1 text-brand-500"></i>
            {connMessage}
          </p>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center gap-3 text-red-600 animate-slide-up mx-auto max-w-lg">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['name', 'barcode', 'ncm'] as SearchMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setQuery(''); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${mode === m ? 'border-brand-600 bg-brand-50 text-brand-600 shadow-sm' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
          >
            <i className={`fa-solid ${m === 'name' ? 'fa-font' : m === 'barcode' ? 'fa-barcode' : 'fa-list-ol'} text-xl`}></i>
            <span className="text-[11px] font-black uppercase tracking-wider">{m === 'name' ? 'Descrição' : m === 'barcode' ? 'Código (EAN)' : 'NCM'}</span>
          </button>
        ))}
      </div>

      <div className="relative group flex flex-col md:block gap-3">
        <div className="absolute left-6 top-[28px] md:top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors">
          {mode === 'name' ? <i className="fa-solid fa-magnifying-glass"></i> : mode === 'barcode' ? <i className="fa-solid fa-barcode"></i> : <i className="fa-solid fa-hashtag"></i>}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            let val = e.target.value;
            if (mode === 'ncm') {
              // Máscara NCM: xxxx.xx.xx
              val = val.replace(/\D/g, '').slice(0, 8);
              if (val.length > 4) val = val.slice(0, 4) + '.' + val.slice(4);
              if (val.length > 7) val = val.slice(0, 7) + '.' + val.slice(7);
            } else if (mode === 'barcode') {
              val = val.replace(/\D/g, '').slice(0, 14);
            }
            setQuery(val);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          placeholder={mode === 'name' ? "Ex: 'Refrigerante', 'Arroz'..." : mode === 'barcode' ? "Digite o EAN (Apenas números)..." : "Informe o NCM (Apenas números)..."}
          className="w-full bg-white border border-slate-200 rounded-[1.5rem] md:rounded-3xl py-4 md:py-6 pl-14 pr-14 md:pr-40 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 transition-all text-base md:text-lg font-medium shadow-sm"
        />
        {(mode === 'barcode' || mode === 'ncm') && (
          <div className="absolute left-14 -bottom-6 flex items-center gap-1.5 text-[10px] font-black text-brand-600 uppercase tracking-tighter animate-fade-in">
            <i className="fa-solid fa-circle-info"></i>
            <span>Este campo aceita apenas números</span>
          </div>
        )}
        {mode === 'barcode' && (
          <button
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-4 md:hidden top-[28px] md:top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-all"
            title="Escanear Código"
          >
            <i className="fa-solid fa-camera"></i>
          </button>
        )}
        <button
          onClick={(e) => handleSearch(e)}
          disabled={loading || connStatus === 'testing'}
          className="md:absolute right-3 md:top-1/2 md:-translate-y-1/2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 md:py-3.5 rounded-xl md:rounded-2xl font-black text-sm transition shadow-lg shadow-brand-500/30 active:scale-95 disabled:opacity-50 w-full md:w-auto"
        >
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Consultar'}
        </button>
      </div>



      {
        product && taxes && (
          <div className="animate-slide-up bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden mt-8">
            <div className="bg-brand-600 p-4 md:p-3 text-white flex flex-col md:flex-row justify-between items-center gap-4 md:gap-2">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                    RESULTADO DA CONSULTA
                  </span>
                </div>
                <h3 className="text-xl md:text-xl font-black tracking-tighter uppercase leading-tight">{product.produtos}</h3>
                <p className="text-brand-100 text-[10px] mt-0.5">{product.category}</p>
              </div>
              <div className="flex md:flex-col items-center md:items-end gap-6 md:gap-1 border-t border-brand-500/30 md:border-0 pt-4 md:pt-0 w-full md:w-auto justify-center overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <div className="shrink-0">
                  <p className="text-[8px] md:text-[9px] font-black text-brand-200 uppercase tracking-widest text-center md:text-right">EAN Identificado</p>
                  <p className="text-sm md:text-base font-mono font-bold text-center md:text-right">{product.ean}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[8px] md:text-[9px] font-black text-brand-200 uppercase tracking-widest text-center md:text-right">NCM</p>
                  <p className="text-sm md:text-base font-mono font-bold text-center md:text-right">{product.ncm}</p>
                </div>
                {product.cest && (
                  <div className="shrink-0">
                    <p className="text-[8px] md:text-[9px] font-black text-brand-200 uppercase tracking-widest text-center md:text-right">CEST</p>
                    <p className="text-sm md:text-base font-mono font-bold text-center md:text-right">{product.cest}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-brand-600"></i>
                  Detalhamento IBS / CBS
                </h4>

                {/* IBS Section */}
                <div className="bg-brand-50/50 border border-brand-100 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-[11px] text-white font-black">I</div>
                      <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest">IBS</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/50 px-2.5 py-1.5 rounded-lg border border-brand-100">
                      <p className="text-[9px] font-bold text-brand-400 uppercase tracking-wider">CST: <span className="text-xs font-black text-brand-700 ml-0.5">{taxes.cst_ibs}</span></p>
                      <div className="w-px h-2.5 bg-brand-200"></div>
                      <p className="text-[9px] font-bold text-brand-400 uppercase tracking-wider">cClass: <span className="text-xs font-black text-brand-700 ml-0.5">{taxes.cClass_ibs}</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-brand-100/50">
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Alíquota</p>
                      <p className="text-lg font-black text-brand-600">{(taxes.aliquotaIbs * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Redução</p>
                      <p className="text-lg font-black text-brand-600">{taxes.reducaoIbs}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Aliq. Final</p>
                      <p className="text-lg font-black text-brand-600">{(taxes.aliquotaFinalIbs * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* CBS Section */}
                <div className="bg-brand-50/50 border border-brand-100 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-[11px] text-white font-black">C</div>
                      <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest">CBS</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/50 px-2.5 py-1.5 rounded-lg border border-brand-100">
                      <p className="text-[9px] font-bold text-brand-400 uppercase tracking-wider">CST: <span className="text-xs font-black text-brand-700 ml-0.5">{taxes.cst_cbs}</span></p>
                      <div className="w-px h-2.5 bg-brand-200"></div>
                      <p className="text-[9px] font-bold text-brand-400 uppercase tracking-wider">cClass: <span className="text-xs font-black text-brand-700 ml-0.5">{taxes.cClass_cbs}</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-brand-100/50">
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Alíquota</p>
                      <p className="text-lg font-black text-brand-600">{(taxes.aliquotaCbs * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Redução</p>
                      <p className="text-lg font-black text-brand-600">{taxes.reducaoCbs}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-brand-600/60 uppercase mb-0.5">Aliq. Final</p>
                      <p className="text-lg font-black text-brand-600">{(taxes.aliquotaFinalCbs * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">INFORMAÇÕES DE IBS E CBS PARA O ANO DE 2026</p>
                </div>
              </div>

              <div className="flex flex-col space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-brand-600"></i>
                  Análise Contextual
                </h4>

                <div className="flex-grow bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                  <div className="relative z-10 h-full flex flex-col">
                    <h5 className="text-[11px] font-black uppercase text-brand-400 tracking-widest mb-6 border-b border-white/10 pb-2">Insight TributeiClass</h5>

                    {isExplaining ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-brand-400"></i>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analisando impacto...</p>
                      </div>
                    ) : explanation ? (
                      <p className="text-sm leading-relaxed font-medium text-slate-200 italic">
                        {explanation}
                      </p>
                    ) : (() => {
                      const db_cclass = taxes?.cClass_ibs || taxes?.cClass_cbs;
                      const simple = (insightsSimplificado as any[]).find(item =>
                        String(item.cClass) === String(db_cclass) ||
                        String(item.cClass) === String(db_cclass).replace(/\./g, '')
                      );

                      if (!simple) return <p className="text-xs text-slate-500">Nenhum insight disponível para este perfil fiscal.</p>;

                      // Helper para cores do badge
                      const getBadgeColor = (badge: string) => {
                        const b = badge.toUpperCase();
                        if (b.includes('ZERO')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
                        if (b.includes('BEM MENOS')) return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
                        if (b.includes('POUCO MENOS') || b.includes('MENOS')) return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
                        if (b.includes('NORMAL')) return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
                        return 'bg-brand-500/20 text-brand-400 border-brand-500/20';
                      };

                      return (
                        <div className="space-y-6 flex-grow">
                          <div className="flex flex-col gap-3">
                            <div className={`self-start px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getBadgeColor(simple.badge)} uppercase`}>
                              {simple.badge}
                            </div>
                            <h6 className="text-lg font-bold text-white leading-tight">
                              {simple.titulo_curto}
                            </h6>
                          </div>

                          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 relative">
                            <i className="fa-solid fa-quote-left absolute top-4 left-4 text-white/5 text-4xl"></i>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed relative z-10 whitespace-pre-wrap italic">
                              {simple.texto_3_linhas}
                            </p>
                          </div>

                          <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-2 justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-800 rounded">SETOR: {simple.categoria}</span>
                              {simple.anexo && <span className="px-2 py-0.5 bg-brand-900/30 text-brand-400 rounded">ANEXO {simple.anexo}</span>}
                            </div>
                            <span className="px-2 py-0.5 bg-white/5 rounded">Ref: #{simple.cClass}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      }
    </div >
  );

  // Dropdown Menu State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const renderConsultancy = () => (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Consultoria Técnica</h2>
          <p className="text-[13px] md:text-sm text-slate-500 font-medium">
            {user?.role === 'admin' ? 'Área Administrativa: Gerenciamento de Consultas Recebidas.' : 'Tire suas dúvidas técnicas com nossos especialistas tributários.'}
          </p>
        </div>

        {user?.role !== 'admin' && (
          <div className="bg-brand-50 border border-brand-100 px-6 py-4 rounded-3xl flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white">
              <i className="fa-solid fa-envelope"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none mb-1">Saldo de Consultas</p>
              <p className="text-lg font-black text-brand-900 leading-none">
                {['premium', 'enterprise'].includes(user?.organization?.plan_type || '')
                  ? 'Ilimitado'
                  : `${(user?.organization?.email_limit || 0) - (user?.organization?.email_count || 0)} disponíveis`}
              </p>
            </div>
          </div>
        )}
      </div>

      {user?.role === 'admin' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex gap-4">
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                  <button
                    onClick={() => onNavigate('admin')}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    <i className="fa-solid fa-gauge-high mr-2"></i>
                    Painel Geral
                  </button>
                  <div className="w-px bg-slate-200 mx-1"></div>
                  <button
                    onClick={() => setAdminViewMode('consultas')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${adminViewMode === 'consultas' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    Consultas
                    {pendingCounts.consultations > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${adminViewMode === 'consultas' ? 'bg-white text-slate-900' : 'bg-brand-100 text-brand-600'}`}>
                        {pendingCounts.consultations}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAdminViewMode('requests')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${adminViewMode === 'requests' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    Cadastros
                    {pendingCounts.requests > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${adminViewMode === 'requests' ? 'bg-white text-slate-900' : 'bg-orange-100 text-orange-600'}`}>
                        {pendingCounts.requests}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAdminViewMode('demos')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${adminViewMode === 'demos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    Demos
                    {pendingCounts.demos > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${adminViewMode === 'demos' ? 'bg-white text-slate-900' : 'bg-emerald-100 text-emerald-600'}`}>
                        {pendingCounts.demos}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {adminViewMode === 'consultas' ? (
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-brand-100 px-3 py-1 rounded-full text-brand-700">
                    {adminConsultations.filter(c => c.status === 'pending').length} PENDENTES
                  </span>
                </div>
              ) : adminViewMode === 'requests' ? (
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-orange-100 px-3 py-1 rounded-full text-orange-700">
                    {adminRequests.filter(r => r.status === 'pending').length} NOVOS PEDIDOS
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-brand-100 px-3 py-1 rounded-full text-brand-700">
                    {adminDemos.filter(d => d.status === 'pending').length} NOVAS DEMOS
                  </span>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {isAdminLoading ? (
                <div className="p-20 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-4"></i>
                  <p className="text-sm font-bold">Carregando dados...</p>
                </div>
              ) : adminViewMode === 'requests' ? (
                // RENDER REQUESTS LIST
                adminRequests.length === 0 ? (
                  <div className="p-20 text-center text-slate-400">
                    <p className="text-sm font-bold">Nenhuma solicitação de cadastro encontrada.</p>
                  </div>
                ) : (
                  adminRequests.map(request => (
                    <div key={request.id} className="p-10 hover:bg-slate-50/30 transition border-b border-slate-50 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm ${request.status === 'completed' ? 'bg-emerald-500 text-white' :
                              request.status === 'rejected' ? 'bg-red-500 text-white' :
                                'bg-orange-500 text-white'
                              }`}>
                              {request.status === 'completed' ? 'Cadastrado' :
                                request.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                            </span>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight">{request.product_name}</h4>
                            {request.ean && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs font-bold border border-slate-200">
                                <i className="fa-solid fa-barcode mr-1.5 text-slate-400"></i>
                                {request.ean}
                              </span>
                            )}
                            {request.ncm && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs font-bold border border-slate-200">
                                NCM: {request.ncm}
                              </span>
                            )}
                          </div>

                          {request.observation && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-600 text-sm">
                              "{request.observation}"
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-building"></i>
                              <span>{request.organizations?.name || '---'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-user"></i>
                              <span>{request.profiles?.name || '---'}</span>
                              <span>({request.profiles?.email || '---'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <i className="fa-regular fa-calendar"></i>
                              <span>{new Date(request.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequestAction(request.id, 'completed')}
                              disabled={isRequestActionLoading === request.id}
                              className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                              {isRequestActionLoading === request.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                              Concluir Cadastro
                            </button>
                            <button
                              onClick={() => handleRejectClick(request.id)}
                              disabled={isRequestActionLoading === request.id}
                              className="bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
                              title="Rejeitar Solicitação"
                            >
                              <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : adminViewMode === 'demos' ? (
                // RENDER DEMO REQUESTS LIST
                adminDemos.length === 0 ? (
                  <div className="p-20 text-center text-slate-400">
                    <p className="text-sm font-bold">Nenhuma solicitação de demonstração encontrada.</p>
                  </div>
                ) : (
                  adminDemos.map(demo => (
                    <div key={demo.id} className="p-10 hover:bg-slate-50/30 transition border-b border-slate-50 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm ${demo.status === 'completed' ? 'bg-emerald-500 text-white' :
                              demo.status === 'rejected' ? 'bg-red-500 text-white' :
                                demo.status === 'contacted' ? 'bg-brand-500 text-white' :
                                  'bg-orange-500 text-white'
                              }`}>
                              {demo.status === 'completed' ? 'Finalizado' :
                                demo.status === 'rejected' ? 'Rejeitado' :
                                  demo.status === 'contacted' ? 'Contatado' : 'Pendente'}
                            </span>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight">{demo.name}</h4>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                              <i className="fa-brands fa-whatsapp text-brand-600"></i>
                              <a href={`https://wa.me/55${demo.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                                {demo.phone}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                              <i className="fa-regular fa-envelope text-brand-600"></i>
                              <a href={`mailto:${demo.email}`} className="hover:underline">
                                {demo.email}
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                            <div className="flex items-center gap-2">
                              <i className="fa-regular fa-calendar"></i>
                              <span>{new Date(demo.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {demo.status === 'pending' && (
                            <button
                              onClick={() => handleDemoAction(demo.id, 'contacted')}
                              disabled={isAdminActionLoading === demo.id}
                              className="bg-brand-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                            >
                              Marcar como Contatado
                            </button>
                          )}
                          {(demo.status === 'pending' || demo.status === 'contacted') && (
                            <>
                              <button
                                onClick={() => handleDemoAction(demo.id, 'completed')}
                                disabled={isAdminActionLoading === demo.id}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                              >
                                Concluir
                              </button>
                              <button
                                onClick={() => handleDemoAction(demo.id, 'rejected')}
                                disabled={isAdminActionLoading === demo.id}
                                className="bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                // RENDER CONSULTATIONS LIST (Existing Code Wrapper)
                adminConsultations.filter(c => adminTab === 'pending' ? c.status !== 'replied' : c.status === 'replied').length === 0 ? (
                  <div className="p-20 text-center text-slate-400">
                    <p className="text-sm font-bold">
                      {adminTab === 'pending' ? 'Nenhuma consulta pendente no momento.' : 'Nenhuma consulta finalizada ainda.'}
                    </p>
                  </div>
                ) : (
                  adminConsultations
                    .filter(c => adminTab === 'pending' ? c.status !== 'replied' : c.status === 'replied')
                    .map(consult => (
                      <div key={consult.id} className="p-10 hover:bg-slate-50/30 transition border-b border-slate-50 last:border-0">
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm ${consult.status === 'replied' ? 'bg-emerald-500 text-white' :
                                consult.status === 'clarification' ? 'bg-amber-500 text-white' : 'bg-orange-500 text-white'
                                }`}>
                                {consult.status === 'replied' ? 'Respondido' :
                                  consult.status === 'clarification' ? 'Pendente de Esclarecimento' : 'Aguardando'}
                              </span>
                              <h4 className="font-black text-slate-900 text-base tracking-tight">{consult.subject}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] font-bold text-slate-500">
                              <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg">
                                <i className="fa-solid fa-building text-slate-400"></i>
                                <span>{consult.organizations?.name || user?.organization?.name || 'Indústria & Comércio'}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg">
                                <i className="fa-solid fa-user text-slate-400"></i>
                                <span>{consult.profiles?.name || 'Cliente'}</span>
                                <span className="text-slate-300 font-medium">({consult.profiles?.email || 'vinicius.machado17@gmail.com'})</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">DATA DE ENVIO</p>
                            <p className="text-xs text-slate-900 font-bold">
                              {new Date(consult.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl mb-8">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CONTEÚDO DA CONSULTA</h5>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{consult.message}"</p>
                        </div>

                        <div className="space-y-6">
                          {consult.clarification_request && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] shadow-sm">
                              <h5 className="text-[10px] font-black uppercase text-amber-600 mb-2 flex items-center gap-2">
                                <i className="fa-solid fa-circle-info"></i>
                                Seu Pedido de Esclarecimento:
                              </h5>
                              <p className="text-sm text-amber-900 font-semibold italic">"{consult.clarification_request}"</p>
                            </div>
                          )}

                          {consult.user_reply && (
                            <div className={`p-8 bg-blue-50 border-2 border-blue-200 rounded-[2.5rem] shadow-lg ${consult.status !== 'replied' ? 'animate-pulse' : ''}`}>
                              <h5 className="text-[11px] font-black uppercase text-blue-700 mb-3 flex items-center gap-2">
                                <i className={consult.status !== 'replied' ? "fa-solid fa-bell" : "fa-solid fa-reply-all"}></i>
                                {consult.status !== 'replied' ? 'O Usuário acaba de responder:' : 'Esclarecimento Enviado pelo Usuário:'}
                              </h5>
                              <p className="text-sm text-blue-900 font-bold leading-relaxed italic">"{consult.user_reply}"</p>
                            </div>
                          )}

                          {consult.status === 'clarification' && !consult.user_reply && (
                            <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
                              <i className="fa-solid fa-clock-rotate-left text-slate-300 text-2xl mb-3"></i>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                Aguardando esclarecimento do cliente...
                              </p>
                            </div>
                          )}

                          <div className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-sm transition-all ${consult.status === 'clarification' && !consult.user_reply ? 'opacity-60 grayscale-[0.5]' : 'border-slate-100'
                            }`}>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <i className="fa-solid fa-pen-nib"></i>
                                  {consult.status === 'clarification' && !consult.user_reply ? 'Resposta Final (Opcional)' : 'Sua Resposta Técnica'}
                                </label>
                                {consult.updated_at && (
                                  <span className="text-[10px] text-slate-400 font-bold italic">
                                    {new Date(consult.updated_at).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>

                              <textarea
                                placeholder="Escreva aqui a orientação técnica fundamentada..."
                                className={`w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-sm font-medium outline-none transition-all min-h-[150px] resize-none ${consult.status === 'replied' ? 'opacity-80 cursor-default' : 'focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white'}`}
                                value={adminReplyMap[consult.id] ?? consult.answer ?? ''}
                                readOnly={consult.status === 'replied'}
                                onChange={(e) => setAdminReplyMap(prev => ({ ...prev, [consult.id]: e.target.value }))}
                              />

                              {consult.status !== 'replied' && (
                                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                  <button
                                    onClick={() => handleAdminAction(consult.id, 'replied')}
                                    disabled={isAdminActionLoading === consult.id}
                                    className="bg-brand-600 text-white px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition flex items-center justify-center gap-3 shadow-xl shadow-brand-500/30 flex-1 group disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <i className={isAdminActionLoading === consult.id ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-check-double group-hover:scale-110 transition-transform"}></i>
                                    {isAdminActionLoading === consult.id ? 'Processando...' : 'Enviar Resposta Final'}
                                  </button>
                                  {consult.status !== 'clarification' && (
                                    <button
                                      onClick={() => handleAdminAction(consult.id, 'clarification')}
                                      disabled={isAdminActionLoading === consult.id}
                                      className="bg-white border-2 border-slate-200 text-slate-600 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-center gap-3 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <i className={isAdminActionLoading === consult.id ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-question-circle"}></i>
                                      {isAdminActionLoading === consult.id ? 'Processando...' : 'Solicitar Esclarecimento'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-xl overflow-hidden relative">
              {emailSuccess && (
                <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 animate-scale-up">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Consulta enviada com sucesso!</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Nossos especialistas responderão em até 48h úteis no seu e-mail cadastrado.</p>
                  </div>
                  <button onClick={() => setEmailSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600 transition">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Qual o assunto da sua dúvida?</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Alíquota de CBS para Arroz Integral"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Detalhe sua pergunta</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Descreva aqui sua dúvida com o máximo de detalhes possível, incluindo NCM ou EAN se houver..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300 resize-none"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/10 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {emailLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      Enviar Dúvida para Especialistas
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* MEU HISTÓRICO (Usuário Comum) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setUserConsultancyView('consultas')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${userConsultancyView === 'consultas' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    Minhas Dúvidas
                    {pendingCounts.consultations > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${userConsultancyView === 'consultas' ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-600'}`}>
                        {pendingCounts.consultations}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setUserConsultancyView('requests')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${userConsultancyView === 'requests' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    Meus Pedidos
                    {pendingCounts.requests > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${userConsultancyView === 'requests' ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-600'}`}>
                        {pendingCounts.requests}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  {userConsultancyView === 'consultas' ? (
                    <span className="text-[10px] font-black bg-slate-200 px-3 py-1 rounded-full text-slate-600">
                      {adminConsultations.length} TOTAL
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-slate-200 px-3 py-1 rounded-full text-slate-600">
                      {userRequests.length} PEDIDOS
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {userConsultancyView === 'requests' ? (
                  // RENDER USER REQUESTS
                  isUserRequestsLoading ? (
                    <div className="p-10 text-center text-slate-400">
                      <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                      <p>Carregando pedidos...</p>
                    </div>
                  ) : userRequests.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                      <p className="text-xs font-bold">Você ainda não solicitou cadastros.</p>
                    </div>
                  ) : (
                    userRequests.map(req => (
                      <div key={req.id} className="p-8 hover:bg-slate-50/50 transition">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${req.status === 'completed' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' :
                              req.status === 'rejected' ? 'bg-red-500 text-white shadow-sm shadow-red-200' :
                                'bg-orange-500 text-white shadow-sm shadow-orange-200'
                              }`}>
                              {req.status === 'completed' ? 'Atendido' :
                                req.status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                            </span>
                            {!req.user_seen && (
                              <span className="bg-brand-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-bounce">
                                NOVO
                              </span>
                            )}
                            <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">{req.product_name}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {req.observation && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-500 text-xs mb-2">
                            "{req.observation}"
                          </div>
                        )}
                        {req.status === 'completed' && (
                          <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <i className="fa-solid fa-check-circle"></i> Produto cadastrado! Você já pode consultá-lo.
                          </p>
                        )}
                        {req.status === 'rejected' && (
                          <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <i className="fa-solid fa-circle-xmark"></i> Solicitação rejeitada pelo suporte.
                          </p>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  // RENDER USER CONSULTATIONS (Existing Logic)
                  isAdminLoading ? (
                    <div className="p-10 text-center text-slate-400">
                      <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                    </div>
                  ) : adminConsultations.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                      <p className="text-xs font-bold">Você ainda não realizou consultas.</p>
                    </div>
                  ) : (
                    adminConsultations.map(consult => (
                      <div key={consult.id} className="p-8 hover:bg-slate-50/50 transition">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${consult.status === 'replied' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' :
                                consult.status === 'clarification' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' :
                                  'bg-orange-500 text-white shadow-sm shadow-orange-200'
                                }`}>
                                {consult.status === 'replied' ? 'Respondido' :
                                  consult.status === 'clarification' ? 'Aguardando sua Resposta' : 'Em Análise'}
                              </span>
                              {!consult.user_seen && (
                                <span className="bg-brand-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-bounce">
                                  NOVO
                                </span>
                              )}
                              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">{consult.subject}</h4>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              Enviado por: {consult.profiles?.name || user.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-0.5">DATA</p>
                            <p className="text-[10px] text-slate-900 font-black whitespace-nowrap">
                              {new Date(consult.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 p-5 rounded-2xl mb-4 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sua Pergunta:</p>
                          <p className="text-xs text-slate-600 leading-relaxed italic">"{consult.message}"</p>
                        </div>

                        {consult.clarification_request && (
                          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl mb-4 shadow-sm">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-circle-info"></i>
                              Solicitação de Esclarecimento do Especialista:
                            </p>
                            <p className="text-xs text-amber-900 leading-relaxed font-semibold italic">"{consult.clarification_request}"</p>
                          </div>
                        )}

                        {consult.user_reply && (
                          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-4 shadow-sm">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-reply"></i>
                              Seu Esclarecimento:
                            </p>
                            <p className="text-xs text-blue-900 leading-relaxed font-semibold italic">"{consult.user_reply}"</p>
                          </div>
                        )}

                        {consult.answer && consult.status === 'replied' && (
                          <div className="p-5 rounded-2xl border mb-4 bg-emerald-50 border-emerald-100">
                            <h5 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-emerald-700">
                              <i className="fa-solid fa-comment-dots"></i>
                              Resposta Final do Especialista:
                            </h5>
                            <p className="text-xs leading-relaxed font-semibold text-emerald-900">
                              {consult.answer}
                            </p>
                          </div>
                        )}

                        {consult.status === 'clarification' && (
                          <div className="mt-4 p-6 bg-white border border-amber-100 rounded-3xl shadow-sm space-y-3">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                              <i className="fa-solid fa-reply"></i>
                              Sua Resposta para o Especialista
                            </label>
                            <textarea
                              placeholder="Escreva aqui as informações solicitadas para prosseguirmos com a análise..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all min-h-[100px] resize-none"
                              value={userClarificationMap[consult.id] || ''}
                              onChange={(e) => setUserClarificationMap(prev => ({ ...prev, [consult.id]: e.target.value }))}
                            />
                            <button
                              onClick={() => handleUserReply(consult.id)}
                              className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition w-full flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                            >
                              <i className="fa-solid fa-paper-plane"></i>
                              Enviar Esclarecimento
                            </button>
                          </div>
                        )}
                      </div>

                    ))
                  )
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <h4 className="text-lg font-black mb-4 tracking-tight">Como funciona?</h4>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">1</div>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">Sua dúvida é encaminhada para nossa banca de especialistas tributários.</p>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">2</div>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">Analisamos a legislação atual e o impacto da Reforma (IBS/CBS).</p>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">3</div>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">Você recebe a resposta detalhada no seu e-mail cadastrado.</p>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 shadow-lg">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Precisa de urgência?</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6">Nosso suporte prioritário está disponível exclusivamente para clientes do plano **Premium** via WhatsApp Business.</p>
              <button
                onClick={() => {
                  if (['premium', 'enterprise'].includes(organizationData?.plan_type || user?.organization?.plan_type || '')) {
                    window.open("https://wa.me/5534991564540", "_blank");
                  } else {
                    setUpgradeReason('whatsapp');
                    setIsUpgradeModalOpen(true);
                  }
                }}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition flex items-center justify-center gap-2 ${['premium', 'enterprise'].includes(organizationData?.plan_type || user?.organization?.plan_type || '')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                  }`}
              >
                <i className={`${['premium', 'enterprise'].includes(organizationData?.plan_type || user?.organization?.plan_type || '') ? 'fa-brands fa-whatsapp' : 'fa-solid fa-lock'} text-sm`}></i>
                {['premium', 'enterprise'].includes(organizationData?.plan_type || user?.organization?.plan_type || '') ? 'Suporte VIP WhatsApp' : 'Contratar Suporte VIP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );


  const renderScannerModal = () => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up flex flex-col relative">
        <div className="bg-brand-600 p-6 text-white text-center relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
          <h3 className="text-xl font-black relative z-10">Escanear Produto</h3>
          <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1 relative z-10">Aponte para o código de barras</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div id="reader" className="w-full aspect-[3/4] bg-slate-50 rounded-3xl overflow-hidden border-2 border-slate-100 shadow-inner relative">
            {isIOS && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}

            <div className="absolute inset-0 border-2 border-brand-500/30 rounded-3xl pointer-events-none z-10 flex items-center justify-center">
              {/* Moldura de Guia para iOS */}
              {isIOS && (
                <div className="w-[85%] h-[45%] border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-white uppercase tracking-widest bg-brand-600 px-2 py-0.5 rounded shadow-lg">
                    Alinhe o código aqui
                  </div>
                  {/* Cantos da moldura */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-500 -ml-0.5 -mt-0.5"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-500 -mr-0.5 -mt-0.5"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-500 -ml-0.5 -mb-0.5"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-500 -mr-0.5 -mb-0.5"></div>
                </div>
              )}
            </div>

            {!isIOS && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-[2px] bg-red-500/50 animate-pulse z-10"></div>}

            {hasTorch && !isIOS && (
              <button
                onClick={async () => {
                  try {
                    const nextState = !isTorchOn;
                    // @ts-ignore
                    await scannerRef.current?.applyVideoConstraints({
                      advanced: [{ torch: nextState }]
                    });
                    setIsTorchOn(nextState);
                  } catch (err) {
                    console.error("Flash error:", err);
                  }
                }}
                className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center z-20 transition-all ${isTorchOn ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/40' : 'bg-slate-900/50 text-white backdrop-blur-md'
                  }`}
              >
                <i className={`fa-solid ${isTorchOn ? 'fa-lightbulb' : 'fa-bolt-slash'} text-lg`}></i>
              </button>
            )}
          </div>

          {isIOS && (
            <div className="mt-4 p-3 bg-brand-50 rounded-2xl text-[10px] text-brand-700 font-bold text-center">
              <i className="fa-solid fa-circle-info mr-1"></i>
              Aproxime o código até ocupar ~70% da área, <br />mantenha boa luz e segure por 1s.
            </div>
          )}

          {scannerError && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold flex flex-col gap-2 w-full animate-shake border border-red-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                {scannerError}
              </div>

              {/* Opção de Digitação Manual direto no erro */}
              <div className="mt-2 pt-2 border-t border-red-100 space-y-2">
                <p className="text-slate-500 uppercase tracking-tighter">Ou digite o código manualmente:</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Código de barras..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[8px] text-red-400 font-bold uppercase tracking-tighter mt-1">
                    Aceita apenas números
                  </p>
                  <button
                    onClick={() => {
                      if (manualBarcode.length >= 8) {
                        setQuery(manualBarcode);
                        setIsScannerOpen(false);
                        setManualBarcode('');
                      }
                    }}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase"
                  >
                    Ir
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 w-full space-y-3">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="w-full py-4 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              Fechar
            </button>
          </div>

          <p className="mt-6 text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest opacity-60">
            Aponte a câmera para o código de barras <br /> para classificação automática.
          </p>
        </div>
      </div>
    </div>
  );


  const renderUpgradeModal = () => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsUpgradeModalOpen(false)}></div>

      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header Decorativo */}
        <div className="bg-brand-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Potencialize sua Gestão Fiscal</h3>
              <p className="text-brand-100 text-sm mt-1">Escolha o plano ideal para o seu volume de negócios</p>
            </div>
            <button onClick={() => setIsUpgradeModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-8">
          {/* Mensagem de Contexto */}
          <div className="flex gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <div className="text-orange-500 mt-1">
              <i className="fa-solid fa-circle-exclamation text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">
                {upgradeReason === 'trial' && "Seu período de teste de 7 dias expirou."}
                {upgradeReason === 'usage' && "Você atingiu o limite de consultas do seu plano atual."}
                {upgradeReason === 'history' && "O Histórico de Consultas é um recurso exclusivo de nossos planos Start, Pro e Premium."}
                {upgradeReason === 'email' && "Você atingiu o limite de consultoria por e-mail do seu plano."}
                {upgradeReason === 'whatsapp' && "O Suporte VIP via WhatsApp é exclusivo para clientes do plano Premium."}
                {upgradeReason === 'payment_failed' && "Aguardando confirmação de pagamento. Regularize sua assinatura para continuar."}
                {upgradeReason === 'request' && "Você atingiu o limite de solicitações de cadastro de novos produtos."}
              </p>
              <p className="text-[11px] text-orange-700 mt-0.5 font-medium leading-relaxed">
                {upgradeReason === 'payment_failed'
                  ? "Detectamos uma falha ou atraso no seu último pagamento. Clique em um dos planos abaixo para regularizar ou trocar de plano."
                  : "Não pare agora! Atualize sua conta para continuar acessando dados precisos da Reforma Tributária."}
              </p>
            </div>
          </div>

          {upgradeReason === 'payment_failed' ? (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-red-50 rounded-full">
                <i className="fa-brands fa-whatsapp text-4xl text-green-500"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Fale com nosso Financeiro</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Para evitar duplicidade de cobranças, por favor entre em contato com nossa equipe para regularizar sua assinatura.
                </p>
              </div>
              <a
                href="https://wa.me/5547997426160?text=Olá, meu pagamento no TributeiClass falhou e preciso de ajuda para regularizar."
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                Resolver via WhatsApp
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Plano Start */}
              <div className="border border-slate-100 bg-slate-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Start</span>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ 59,90</p>
                <p className="text-[10px] text-slate-400 font-bold mb-4">/mês</p>
                <ul className="text-[10px] text-slate-600 font-medium space-y-2 mb-6 text-left w-full">
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> 300 Consultas/mês</li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> Histórico Completo</li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> 30 Solicitações/mês</li>
                </ul>
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    onNavigate('pricing');
                  }}
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-100 transition mt-auto uppercase"
                >
                  Assinar Start
                </button>
              </div>

              {/* Plano Pro (Destaque) */}
              <div className="border border-brand-200 bg-brand-50 p-6 rounded-3xl flex flex-col items-center text-center scale-105 shadow-xl shadow-brand-500/10 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full">Destaque</div>
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">Pro</span>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ 74,90</p>
                <p className="text-[10px] text-slate-400 font-bold mb-4">/mês</p>
                <ul className="text-[10px] text-slate-600 font-medium space-y-2 mb-6 text-left w-full">
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> <strong className="font-black text-brand-700">Ilimitado</strong></li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> Histórico Completo</li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> 50 Solicitações/mês</li>
                </ul>
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    onNavigate('pricing');
                  }}
                  className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-black hover:bg-brand-700 transition mt-auto uppercase shadow-lg shadow-brand-500/30"
                >
                  Assinar Pro
                </button>
              </div>

              {/* Plano Premium */}
              <div className="border border-slate-100 bg-slate-50 p-6 rounded-3xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black text-accent-600 uppercase tracking-widest mb-2">Premium</span>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ 99,90</p>
                <p className="text-[10px] text-slate-400 font-bold mb-4">/mês</p>
                <ul className="text-[10px] text-slate-600 font-medium space-y-2 mb-6 text-left w-full">
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> <strong>Consultas Ilimitadas</strong></li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> Até 5 Usuários</li>
                  <li><i className="fa-solid fa-check text-green-500 mr-1.5"></i> Suporte VIP 24h</li>
                </ul>
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    onNavigate('pricing');
                  }}
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-100 transition mt-auto uppercase"
                >
                  Assinar Premium
                </button>
              </div>
            </div>
          )}

          {upgradeReason !== 'payment_failed' && (
            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 font-medium">Tem dúvidas sobre qual plano escolher?</p>
              <button
                onClick={() => window.open("https://wa.me/5534991564540", "_blank")}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition flex items-center gap-2"
              >
                <i className="fa-brands fa-whatsapp text-emerald-400"></i>
                Falar com Comercial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  const renderSafeRejectModal = () => (
    rejectModalOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setRejectModalOpen(false)}></div>
        <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border-4 border-red-500/20">
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
              <i className="fa-solid fa-triangle-exclamation text-4xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Tem certeza?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Você está prestes a rejeitar esta solicitação. Essa ação não pode ser desfeita e notificará o usuário.
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Digite "SIM" para confirmar
              </label>
              <input
                type="text"
                className="w-full text-center text-xl font-black text-slate-800 bg-white border-2 border-slate-200 rounded-xl py-3 uppercase focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder:text-slate-200"
                placeholder="SIM"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRejection}
                disabled={confirmationText !== 'SIM'}
                className="flex-1 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-red-500/20"
              >
                Rejeitar Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderCancelModal = () => {
    if (!isCancelModalOpen) return null;

    const org = organizationData || user?.organization;
    // Considera os primeiros 7 dias da criação da conta como o período de arrependimento (contratação)
    const isWithin7Days = org?.created_at
      ? (new Date().getTime() - new Date(org.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000)
      : true;

    const hasCommitment = org?.has_commitment;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsCancelModalOpen(false)}></div>
        <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border-4 border-red-500/20">
          <div className="p-10 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 text-red-600">
              <i className="fa-solid fa-ban text-5xl"></i>
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-4">Confirmar Cancelamento</h3>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 space-y-4 text-left">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                <i className="fa-solid fa-check text-green-500 mr-2"></i>
                Seu acesso continuará liberado até <strong>{org?.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : 'o fim do mês'}</strong>.
              </p>

              {!isWithin7Days && hasCommitment && (
                <div className="p-4 bg-orange-100 border border-orange-200 rounded-xl">
                  <p className="text-[10px] font-black text-orange-800 uppercase flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-triangle-exclamation"></i> Alerta de Carência
                  </p>
                  <p className="text-[10px] font-medium text-orange-700 leading-tight">
                    Conforme a contratação do seu plano com carência, haverá uma multa de quebra de contrato proporcional ao período restante.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                <i className="fa-solid fa-check text-green-500 mr-2"></i>
                Nenhuma nova cobrança será realizada após o faturamento atual.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const org = organizationData || user?.organization;
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-slide-up">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Configurações da Conta</h1>
          <p className="text-[13px] md:text-sm text-slate-500 font-medium">Gerencie seu perfil, assinatura e preferências da conta.</p>
        </div>
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-12 border border-slate-200 shadow-xl space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Perfil</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Nome</p>
                <p className="text-base font-bold text-slate-700">{user?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                <p className="text-base font-bold text-slate-700">{user?.email}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Organização</h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Empresa</p>
                  <p className="text-xl font-black text-slate-800">{org?.name}</p>
                </div>
                <div className="px-3 py-1 bg-brand-600 text-white text-[10px] font-black rounded-full uppercase">
                  {org?.plan_type}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Consumo do Plano</span>
                  <span>{org?.usage_count} / {org?.usage_limit}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(((org?.usage_count || 0) / (org?.usage_limit || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  {org?.plan_type === 'gratis'
                    ? `Expira em: ${org?.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : 'N/A'}`
                    : org?.cancel_at_period_end
                      ? <span className="text-orange-600 font-bold">Acesso liberado até: {org?.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : 'N/A'}</span>
                      : `Próxima cobrança: ${org?.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : 'N/A'}`}
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => onNavigate('pricing')}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition shadow-sm"
                >
                  <i className="fa-solid fa-arrows-rotate text-brand-600"></i>
                  {org?.plan_type === 'gratis' ? 'Fazer Upgrade para Pro' : 'Mudar de Plano / Gerenciar Assinatura'}
                </button>
              </div>
            </div>
          </div>

          {/* Seção de Cancelamento */}
          {org?.plan_type !== 'gratis' && !org?.cancel_at_period_end && (
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {org?.has_commitment
                    ? "Deseja solicitar o cancelamento ou alteração?"
                    : "Deseja cancelar sua assinatura?"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {org?.has_commitment
                    ? "Planos com carência de 12 meses devem ser consultados com o financeiro."
                    : "Você manterá o acesso até o fim do faturamento atual."}
                </p>
              </div>
              <button
                onClick={() => {
                  if (org?.has_commitment) {
                    window.open("https://wa.me/5534991564540", "_blank");
                  } else {
                    setIsCancelModalOpen(true);
                  }
                }}
                className={`px-4 py-2 font-bold text-xs rounded-xl transition border ${org?.has_commitment
                  ? "text-brand-600 bg-brand-50 border-brand-100 hover:bg-brand-100"
                  : "text-red-500 hover:bg-red-50 border-transparent hover:border-red-100"
                  }`}
              >
                {org?.has_commitment ? "Falar com Consultor" : "Cancelar Assinatura"}
              </button>
            </div>
          )}

          {org?.cancel_at_period_end && (
            <div className="p-6 bg-orange-50 border-2 border-orange-100 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 animate-scale-up">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                <i className="fa-solid fa-clock-rotate-left text-xl"></i>
              </div>
              <div className="text-center md:text-left">
                <p className="text-xs font-black text-orange-900 uppercase tracking-tighter">Assinatura em encerramento</p>
                <p className="text-[10px] font-medium text-orange-800/80 leading-tight">
                  Você solicitou o cancelamento. Seu acesso premium continua garantido até o dia <span className="font-bold text-orange-900">{org?.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : 'final do período'}</span>. Após esta data, sua conta retornará ao plano Grátis.
                </p>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button onClick={onLogout} className="w-full py-4 border-2 border-red-100 text-red-500 font-black rounded-2xl hover:bg-red-50 transition">
              <i className="fa-solid fa-right-from-bracket mr-2"></i>
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-8 border-b border-slate-50">
          <Logo iconSize={64} />
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button onClick={() => setActiveTab('search')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'search' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-magnifying-glass"></i> Consulta
          </button>
          <button
            onClick={() => {
              if (user?.organization?.plan_type === 'gratis') {
                setUpgradeReason('history');
                setIsUpgradeModalOpen(true);
              } else {
                setActiveTab('history');
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'history' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-clock-rotate-left"></i> Histórico
            </div>
            {user?.organization?.plan_type === 'gratis' && <i className="fa-solid fa-lock text-[10px] opacity-40"></i>}
          </button>
          <button onClick={() => setActiveTab('consultancy')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'consultancy' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-envelope-open-text"></i> Consultoria
            </div>
            {(pendingCounts.requests + pendingCounts.consultations) > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {pendingCounts.requests + pendingCounts.consultations}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (['gratis', 'start'].includes(user?.organization?.plan_type || '')) {
                setUpgradeReason('usage');
                setIsUpgradeModalOpen(true);
              } else {
                setActiveTab('batch');
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'batch' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-file-invoice"></i> Análise XML
            </div>
            {['gratis', 'start'].includes(user?.organization?.plan_type || '') && <i className="fa-solid fa-lock text-[10px] opacity-40"></i>}
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'settings' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-gear"></i> Minha Conta
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition mt-4"
            >
              <i className="fa-solid fa-gauge-high"></i> Painel Admin
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition">
            <i className="fa-solid fa-right-from-bracket"></i> Sair
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-full overflow-hidden pb-20 lg:pb-0">
        <header className="h-24 bg-white border-b border-slate-200 px-6 flex items-center justify-between relative z-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${connStatus === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' :
              connStatus === 'testing' ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/20' :
                'bg-red-500 shadow-lg shadow-red-500/20'
              }`} title={connStatus === 'online' ? 'Conectado à Base Live' : connStatus === 'testing' ? 'Verificando conexão...' : 'Modo Demo (Offline)'}></span>
            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
              {activeTab === 'search' ? 'Consulta de Produtos' : activeTab === 'history' ? 'Histórico de Consultas' : activeTab === 'consultancy' ? 'Consultoria Técnica' : activeTab === 'batch' ? 'Análise XML' : 'Minha Conta'}
            </h2>
          </div>



          {/* Usage Limit Indicators - Desktop Only */}
          {organizationData && user?.role !== 'admin' && (
            <div className="hidden lg:flex items-center gap-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* Badge: Buscas */}
              <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-2 rounded-full border border-slate-200" title="Consumo de buscas de produtos">
                <i className={`fa-solid fa-magnifying-glass text-sm ${organizationData.usage_count >= organizationData.usage_limit ? 'text-red-500' : 'text-emerald-500'}`}></i>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-tight">Buscas</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-800">{organizationData.usage_count} / {organizationData.usage_limit}</span>
                  </div>
                </div>
              </div>

              {/* Badge: Consultas Técnicas (Dúvidas) */}
              <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-2 rounded-full border border-slate-200" title="Saldo de consultoria técnica">
                <i className={`fa-solid fa-envelope-open-text text-sm ${organizationData.email_count >= organizationData.email_limit ? 'text-red-500' : 'text-blue-500'}`}></i>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-tight">Dúvidas</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-800">{organizationData.email_count} / {organizationData.email_limit}</span>
                  </div>
                </div>
              </div>

              {/* Badge: Solicitações (Pedidos) */}
              <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-2 rounded-full border border-slate-200" title="Solicitações de cadastro">
                <i className={`fa-solid fa-clipboard-question text-sm ${organizationData.request_count >= organizationData.request_limit ? 'text-red-500' : 'text-orange-500'}`}></i>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-tight">Pedidos</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-800">{organizationData.request_count} / {organizationData.request_limit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-4 focus:outline-none hover:opacity-80 transition"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                <p className="text-xs font-bold text-slate-700">{user?.name}</p>
              </div>
              <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-brand-500/20">
                {user?.name?.[0]}
              </div>
              <i className={`fa-solid fa-chevron-down text-slate-300 text-xs transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-slide-up origin-top-right">
                  <div className="p-4 border-b border-slate-50 sm:hidden">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[10px] text-slate-500">{user?.role}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setActiveTab('search'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition text-left"
                    >
                      <i className="fa-solid fa-magnifying-glass text-slate-400"></i> Consulta de Produtos
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { onNavigate('admin'); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs transition text-left"
                      >
                        <i className="fa-solid fa-gauge-high"></i> Painel Administrativo
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveTab('settings'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition text-left"
                    >
                      <i className="fa-solid fa-gear text-slate-400"></i> Minha Conta
                    </button>
                    <button
                      onClick={() => { setActiveTab('consultancy'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition text-left"
                    >
                      <i className="fa-solid fa-envelope-open-text text-slate-400"></i> Consultoria
                    </button>
                    <button
                      onClick={() => { setActiveTab('history'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition text-left lg:hidden"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-slate-400"></i> Histórico
                    </button>
                    <div className="h-px bg-slate-50 my-1"></div>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-xs transition text-left"
                    >
                      <i className="fa-solid fa-right-from-bracket"></i> Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Mobile Usage Limit Indicators */}
        {organizationData && user?.role !== 'admin' && (
          <div className="lg:hidden h-20 bg-white border-b border-slate-200 flex items-center justify-around px-6 gap-2 shrink-0">
            {/* Badge: Buscas */}
            <div className="flex flex-col items-center justify-center py-1" title="Buscas Realizadas">
              <div className="flex items-center gap-1.5 mb-0.5">
                <i className={`fa-solid fa-magnifying-glass text-[10px] ${organizationData.usage_count >= organizationData.usage_limit ? 'text-red-500' : 'text-brand-500'}`}></i>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Buscas</span>
              </div>
              <span className="text-[11px] font-black text-slate-800 leading-none">{organizationData.usage_count}/{organizationData.usage_limit}</span>
            </div>

            <div className="w-px h-8 bg-slate-100"></div>

            {/* Badge: Dúvidas */}
            <div className="flex flex-col items-center justify-center py-1" title="Dúvidas Técnicas">
              <div className="flex items-center gap-1.5 mb-0.5">
                <i className={`fa-solid fa-envelope-open-text text-[10px] ${organizationData.email_count >= organizationData.email_limit ? 'text-red-500' : 'text-brand-500'}`}></i>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Dúvidas</span>
              </div>
              <span className="text-[11px] font-black text-slate-800 leading-none">{organizationData.email_count}/{organizationData.email_limit}</span>
            </div>

            <div className="w-px h-8 bg-slate-100"></div>

            {/* Badge: Pedidos */}
            <div className="flex flex-col items-center justify-center py-1" title="Pedidos de Cadastro">
              <div className="flex items-center gap-1.5 mb-0.5">
                <i className={`fa-solid fa-clipboard-question text-[10px] ${organizationData.request_count >= organizationData.request_limit ? 'text-red-500' : 'text-brand-500'}`}></i>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Pedidos</span>
              </div>
              <span className="text-[11px] font-black text-slate-800 leading-none">{organizationData.request_count}/{organizationData.request_limit}</span>
            </div>
          </div>
        )}

        <div className="flex-grow overflow-y-auto p-5 md:p-10">
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'consultancy' && renderConsultancy()}
          {activeTab === 'batch' && <XMLAnalysis />}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-slide-up">
              <div className="flex justify-between items-baseline gap-4">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Histórico de Consultas</h2>
                  <p className="text-[13px] md:text-sm text-slate-500 font-medium">Visualize e acesse rapidamente suas consultas anteriores.</p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                  >
                    Limpar Histórico
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-slate-400 font-medium">Nenhum produto consultado nesta sessão.</p>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => handleHistoryClick(h)}>
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase">{h.produtos}</h4>
                      <p className="text-[10px] font-bold text-slate-400">EAN: {h.ean} | NCM: {h.ncm}{h.cest ? ` | CEST: ${h.cest}` : ''}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-200"></i>
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-brand-600' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-magnifying-glass text-lg"></i>
          <span className="text-[10px] font-black uppercase tracking-tighter">Consulta</span>
        </button>
        <button
          onClick={() => {
            if (user?.organization?.plan_type === 'gratis') {
              setUpgradeReason('history');
              setIsUpgradeModalOpen(true);
            } else {
              setActiveTab('history');
            }
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-brand-600' : 'text-slate-400'}`}
        >
          <div className="relative">
            <i className="fa-solid fa-clock-rotate-left text-lg"></i>
            {user?.organization?.plan_type === 'gratis' && (
              <i className="fa-solid fa-lock absolute -top-1 -right-1 text-[8px] text-slate-400"></i>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Histórico</span>
        </button>
        <button
          onClick={() => setActiveTab('consultancy')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'consultancy' ? 'text-brand-600' : 'text-slate-400'}`}
        >
          <div className="relative">
            <i className="fa-solid fa-envelope-open-text text-lg"></i>
            {(pendingCounts.requests + pendingCounts.consultations) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {pendingCounts.requests + pendingCounts.consultations}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Dúvidas</span>
        </button>
        <button
          onClick={() => {
            if (['gratis', 'start'].includes(user?.organization?.plan_type || '')) {
              setUpgradeReason('usage');
              setIsUpgradeModalOpen(true);
            } else {
              setActiveTab('batch');
            }
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'batch' ? 'text-brand-600' : 'text-slate-400'}`}
        >
          <div className="relative">
            <i className="fa-solid fa-file-invoice text-lg"></i>
            {['gratis', 'start'].includes(user?.organization?.plan_type || '') && (
              <i className="fa-solid fa-lock absolute -top-1 -right-1 text-[8px] text-slate-400"></i>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">XML</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-brand-600' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-user text-lg"></i>
          <span className="text-[10px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>

      {/* Modais Globais */}
      {renderSafeRejectModal()}
      {renderCancelModal()}
      {isUpgradeModalOpen && renderUpgradeModal()}
      {isRequestModalOpen && renderRequestModal()}
      {isSelectionOpen && searchResults.length > 0 && renderSelectionModal()}
      {isScannerOpen && renderScannerModal()}
    </div>
  );
};

export default Dashboard;
