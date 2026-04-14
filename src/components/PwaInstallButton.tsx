import { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone;
  });
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos] = useState(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });

  useEffect(() => {
    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    // No iPhone/Safari o guia é obrigatório
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    // No Android/Chrome/PC tentamos o instalador direto do navegador
    if (installPrompt) {
      const { outcome } = await installPrompt.prompt();
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsStandalone(true);
      }
    } else {
      // Se por algum motivo o navegador ainda não liberou o instalador automático,
      // mostramos o guia genérico como alternativa.
      setShowIosGuide(true);
    }
  };

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleInstallClick}
        className="fixed bottom-32 right-6 z-50 flex items-center space-x-2 bg-bronze-main text-graphite-dark p-3 pr-5 rounded-full shadow-[0_10px_30px_rgba(197,160,89,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 animate-bounce group"
      >
        <div className="bg-graphite-dark rounded-full p-2 group-hover:rotate-12 transition-transform">
          <Download className="w-5 h-5 text-bronze-main" />
        </div>
        <span className="font-bold text-xs uppercase tracking-tighter">Baixar App</span>
      </button>

      {/* iOS/Generic Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-graphite-light w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <div className="flex justify-end">
                <button onClick={() => setShowIosGuide(false)} className="p-2 text-zinc-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-bronze-main/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-bronze-main/20">
                <Smartphone className="w-8 h-8 text-bronze-main" />
              </div>
              
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Instalar Captain App</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 px-4">
                Siga os passos abaixo para ter o sistema direto na sua tela inicial:
              </p>

              <div className="space-y-4 text-left">
                {isIos ? (
                  <>
                    <div className="flex items-center space-x-4 p-3 bg-zinc-50 dark:bg-graphite-main rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <div className="bg-blue-500 p-2 rounded-lg"><Share className="w-5 h-5 text-white" /></div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">1. No Safari</p>
                        <p className="text-[10px] text-zinc-500">Toque no botão 'Compartilhar' lá embaixo.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-3 bg-zinc-50 dark:bg-graphite-main rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <div className="bg-zinc-200 dark:bg-zinc-700 p-2 rounded-lg"><PlusSquare className="w-5 h-5 text-zinc-600 dark:text-zinc-300" /></div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">2. Adicionar</p>
                        <p className="text-[10px] text-zinc-500">Role para baixo e toque em 'Adicionar à Tela de Início'.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-zinc-50 dark:bg-graphite-main rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Toque nos <span className="font-bold">três pontos</span> do seu navegador e selecione <span className="font-bold text-bronze-main text-lg uppercase block mt-1 tracking-widest">"Instalar Aplicativo"</span>
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowIosGuide(false)}
                className="w-full mt-8 py-4 bg-bronze-main text-graphite-dark font-black uppercase tracking-widest rounded-2xl shadow-lg ring-4 ring-bronze-main/10"
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
