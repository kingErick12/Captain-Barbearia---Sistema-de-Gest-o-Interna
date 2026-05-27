import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, setHours, setMinutes, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, CalendarDays, Users, TrendingUp } from 'lucide-react';
import { supabase, isSupabaseConfigured, MOCK_PROFILES } from '../../lib/supabase';
import type { Agendamento } from '../../lib/supabase';
import { BookingModal } from '../../components/BookingModal';
import { FinancialDashboard } from '../../components/FinancialDashboard';
import { TeamManagement } from '../../components/TeamManagement';
import { PwaInstallButton } from '../../components/PwaInstallButton';
import { cn } from '../../lib/utils';

export function AdminDashboard() {
  const navigate = useNavigate();
  
  // Auth state
  const currentUserId = localStorage.getItem('captain_user_id');
  const currentUser = MOCK_PROFILES.find(p => p.id === currentUserId);
  
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState<string>(currentUserId || '');
  const [currentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'agenda' | 'stats' | 'equipe'>('agenda');
  
  // Data state
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  // Redireciona se não estiver logado ou se o usuário não existir mais
  useEffect(() => {
    if (!currentUserId || !currentUser) {
      localStorage.removeItem('captain_user_id');
      navigate('/login');
    }
  }, [currentUserId, currentUser, navigate]);

  // Busca e Realtime dos Agendamentos
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchAgendamentos = async () => {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*');
      
      if (data) setAgendamentos(data as Agendamento[]);
      if (error) console.error("Erro ao buscar:", error);
    };

    fetchAgendamentos();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchAgendamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('captain_user_id');
    navigate('/');
  };

  const handleOpenModal = (time: Date) => {
    setSelectedTimeSlot(time);
    setIsModalOpen(true);
  };

  const handleSaveAgendamento = async (clienteNome: string, servico: 'Corte' | 'Barba' | 'Combo') => {
    if (!selectedTimeSlot) return;
    
    const newAgendamento: Agendamento = {
      id: Math.random().toString(36).substr(2, 9),
      cliente_id: 'cliente_mock',
      cliente_nome: clienteNome,
      servico: servico,
      data_hora: selectedTimeSlot.toISOString(),
      barbeiro_id: selectedBarbeiroId
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('agendamentos').insert([newAgendamento]);
      if (error) console.error("Erro ao inserir:", error);
    } else {
      // MOCK
      const mockAgendamento: Agendamento = {
        ...newAgendamento,
        id: Math.random().toString(36).substring(7)
      };
      setAgendamentos((prev) => [...prev, mockAgendamento]);
    }
    
    setIsModalOpen(false);
  };

  // Gerar slots de horários das 08:00 às 19:00 com intervalos de 40 min
  const timeSlots = useMemo(() => {
    const slots = [];
    let currentMinutes = 8 * 60; // 08:00
    const endMinutes = 19 * 60; // 19:00
    
    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(setMinutes(setHours(currentDate, hours), mins));
      currentMinutes += 40; // Intervalo de 40 min
    }
    return slots;
  }, [currentDate]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-graphite-light/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 md:px-6 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full border border-bronze-main" />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 uppercase tracking-widest">Bem-vindo</span>
            <span className="text-xl font-bold tracking-wide text-bronze-main">
              {currentUser.nome}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 rounded-full bg-zinc-100 dark:bg-graphite-main border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-bronze-main dark:hover:border-bronze-main transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        
        {activeTab === 'stats' ? (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <FinancialDashboard currentUser={currentUser} agendamentos={agendamentos} />
          </div>
        ) : activeTab === 'equipe' && currentUser.role === 'dono' ? (
          <TeamManagement />
        ) : (
          <div className="animate-in fade-in slide-in-from-left-8 duration-500 space-y-6">
            {/* Filtro de Barbeiro (Apenas para o Dono) */}
            {currentUser.role === 'dono' && (
              <div className="bg-white/90 dark:bg-graphite-light p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none backdrop-blur-md">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Visualizar Agenda de:
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {MOCK_PROFILES.filter(p => p.role === 'barbeiro' || p.role === 'dono').map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedBarbeiroId(profile.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold tracking-wide whitespace-nowrap transition-all",
                        selectedBarbeiroId === profile.id
                          ? "bg-bronze-main text-white dark:text-graphite-main shadow-md"
                          : "bg-zinc-100 dark:bg-graphite-main text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500"
                      )}
                    >
                      {profile.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data selecionada */}
            <div className="flex items-center justify-between bg-white/50 dark:bg-bronze-main/10 border border-zinc-200 dark:border-bronze-main/30 p-4 rounded-2xl shadow-sm backdrop-blur-sm">
              <div className="flex items-center text-zinc-900 dark:text-bronze-main font-black">
                <div className="bg-bronze-main p-2 rounded-lg mr-3 shadow-md">
                  <CalendarDays className="w-5 h-5 text-zinc-900" />
                </div>
                <span className="text-lg capitalize tracking-tight">
                  {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Grade de Horários */}
            <div className="space-y-3 mt-8">
              {timeSlots.map((time, index) => {
                // Filtra os agendamentos daquele horario especifico para o barbeiro selecionado
                const agendamento = agendamentos.find((a) => {
                  if (a.barbeiro_id !== selectedBarbeiroId) return false;
                  const agendamentoDate = parseISO(a.data_hora);
                  return isSameDay(agendamentoDate, time) && 
                         agendamentoDate.getHours() === time.getHours() && 
                         agendamentoDate.getMinutes() === time.getMinutes();
                });

                return (
                  <div 
                    key={index}
                    className={cn(
                      "relative flex p-1 rounded-2xl transition-all",
                      agendamento 
                        ? "bg-white/90 dark:bg-graphite-light border border-zinc-200 dark:border-zinc-800 opacity-95 shadow-sm dark:shadow-none"
                        : "hover:bg-white/50 dark:hover:bg-graphite-light/50 border border-transparent cursor-pointer backdrop-blur-[2px]"
                    )}
                    onClick={() => !agendamento && handleOpenModal(time)}
                  >
                    {/* Coluna da Hora */}
                    <div className="w-20 flex flex-col justify-center items-center font-bold text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800/50">
                      {format(time, 'HH:mm')}
                    </div>

                    {/* Coluna do Conteúdo */}
                    <div className="flex-1 p-3 ml-2">
                      {agendamento ? (
                        <div className="bg-zinc-50 dark:bg-graphite-main p-3 rounded-xl border border-zinc-100 dark:border-zinc-700/50 shadow-inner">
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-zinc-800 dark:text-white tracking-wide">
                              {agendamento.cliente_nome}
                            </p>
                            <span className="text-[10px] uppercase tracking-widest bg-bronze-main/10 text-bronze-main px-2 py-1 rounded-md border border-bronze-main/20">
                              {agendamento.servico}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[48px] flex items-center ml-2 text-sm text-zinc-600 font-medium italic">
                          + Toque para agendar
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg bg-white dark:bg-graphite-light/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-1.5 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab('agenda')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-3 rounded-2xl transition-all duration-300",
            activeTab === 'agenda' 
              ? "text-bronze-main bg-bronze-main/10" 
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <CalendarDays className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Agenda</span>
        </button>
        
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-3 rounded-2xl transition-all duration-300",
            activeTab === 'stats' 
              ? "text-bronze-main bg-bronze-main/10" 
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <TrendingUp className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>
        
        {currentUser.role === 'dono' && (
          <button
            onClick={() => setActiveTab('equipe')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-3 rounded-2xl transition-all duration-300",
              activeTab === 'equipe' 
                ? "text-bronze-main bg-bronze-main/10" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <Users className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Equipe</span>
          </button>
        )}
      </nav>

      <BookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedTime={selectedTimeSlot}
        onSave={handleSaveAgendamento}
      />

      <PwaInstallButton />
    </div>
  );
}
