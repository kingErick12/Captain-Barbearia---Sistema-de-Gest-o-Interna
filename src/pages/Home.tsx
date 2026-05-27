import { useNavigate } from 'react-router-dom';
import { Scissors, MapPin, Phone } from 'lucide-react';
import { PwaInstallButton } from '../components/PwaInstallButton';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-graphite-dark text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80" 
          alt="Barbearia Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="relative z-20 text-center px-6 max-w-2xl mx-auto mt-12">
          <img 
            src="/logo.jpg" 
            alt="Captain Barbearia Logo" 
            className="w-24 h-24 rounded-full border-2 border-bronze-main shadow-[0_0_30px_rgba(197,160,89,0.5)] mx-auto mb-6 object-cover" 
          />
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase text-shadow mb-4">
            Captain <span className="text-bronze-main">Barbearia</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 font-light mb-8">
            Estilo, precisão e tradição em cada corte. O melhor cuidado para o homem moderno.
          </p>
          
          <button
            onClick={() => navigate('/login')} 
            className="w-full sm:w-auto px-8 py-4 bg-bronze-main text-graphite-dark font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_20px_rgba(197,160,89,0.4)] hover:bg-bronze-light hover:scale-105 transition-all duration-300"
          >
            Agendar Horário
          </button>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-6 bg-white dark:bg-graphite-light">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white">Nossos Serviços</h2>
            <div className="w-16 h-1 bg-bronze-main mx-auto mt-4 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 dark:bg-graphite-main p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center hover:border-bronze-main dark:hover:border-bronze-main transition-colors">
              <Scissors className="w-10 h-10 text-bronze-main mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Corte</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Degradê, social, militar ou na tesoura. Alinhado ao seu estilo.</p>
            </div>
            
            <div className="bg-zinc-50 dark:bg-graphite-main p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center hover:border-bronze-main dark:hover:border-bronze-main transition-colors">
              <div className="w-10 h-10 bg-bronze-main rounded-full flex items-center justify-center mx-auto mb-4 text-graphite-dark font-bold text-xl">B</div>
              <h3 className="text-xl font-bold mb-2">Barba</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Design, lenha, toalha quente e finalização com produtos premium.</p>
            </div>
            
            <div className="bg-zinc-50 dark:bg-graphite-main p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center hover:border-bronze-main dark:hover:border-bronze-main transition-colors">
              <div className="w-10 h-10 border-2 border-bronze-main rounded-full flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-5 h-5 text-bronze-main" />
              </div>
              <h3 className="text-xl font-bold mb-2">Combo</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Cabelo e Barba completos. A experiência definitiva da Captain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Info */}
      <footer className="mt-auto py-12 px-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-4">Contato</h3>
            <div className="space-y-3">
              <p className="flex items-center text-zinc-500 dark:text-zinc-400">
                <MapPin className="w-5 h-5 mr-3 text-bronze-main" />
                Rua Exemplo, 123 - Centro, São Paulo
              </p>
              <p className="flex items-center text-zinc-500 dark:text-zinc-400">
                <Phone className="w-5 h-5 mr-3 text-bronze-main" />
                (11) 99999-9999
              </p>
              <p className="flex items-center text-zinc-500 dark:text-zinc-400">
                <span className="w-5 h-5 mr-3 text-bronze-main font-bold text-xl leading-none">@</span>
                @captainbarbearia
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end justify-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center md:text-right">
              Para a melhor experiência e para receber notificações dos seus agendamentos, baixe nosso App.
            </p>
          </div>
        </div>
      </footer>

      {/* Botão flutuante para download do PWA */}
      <PwaInstallButton />
    </div>
  );
}
