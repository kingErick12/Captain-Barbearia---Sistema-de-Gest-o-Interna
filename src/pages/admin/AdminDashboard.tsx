import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, setHours, setMinutes, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, CalendarDays, Users, TrendingUp, Check, X, ShieldAlert } from 'lucide-react';
import { supabase, isSupabaseConfigured, MOCK_PROFILES, logEvent } from '../../lib/supabase';
import type { Agendamento, Profile } from '../../lib/supabase';
import { BookingModal } from '../../components/BookingModal';
import { FinancialDashboard } from '../../components/FinancialDashboard';
import { TeamManagement } from '../../components/TeamManagement';
import { SystemLogs } from '../../components/SystemLogs';
import { PwaInstallButton } from '../../components/PwaInstallButton';
import { cn } from '../../lib/utils';

export function AdminDashboard() {
  const navigate = useNavigate();
  
  // Auth state
  const currentUserId = localStorage.getItem('captain_user_id');
  const userEmail = localStorage.getItem('captain_user_email') || '';
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const isSupport = currentUser?.role === 'adm' || userEmail === 'admin@captain.com' || userEmail === 'admin@admin.com';
  
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState<string>(currentUserId || '');
  const [currentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'agenda' | 'stats' | 'equipe' | 'logs'>('agenda');
  
  // Data state
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [equipe, setEquipe] = useState<Profile[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  // Carrega o perfil do usuário e redireciona se necessário
  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    const loadUser = async () => {
      try {
        console.log("[AdminDashboard] Iniciando loadUser. ID:", currentUserId);
        
        if (!isSupabaseConfigured) {
          const user = MOCK_PROFILES.find(p => p.id === currentUserId);
          if (user) {
            console.log("[AdminDashboard] Modo Mock: Usuário encontrado:", user);
            setCurrentUser(user);
          } else {
            console.warn("[AdminDashboard] Modo Mock: Usuário não encontrado, redirecionando para login.");
            localStorage.removeItem('captain_user_id');
            navigate('/login');
          }
          setLoadingUser(false);
          return;
        }

        // Garantir que a sessão foi carregada na memória do cliente Supabase antes da consulta
        console.log("[AdminDashboard] Obtendo sessão do Supabase...");
        await supabase.auth.getSession();

        console.log("[AdminDashboard] Consultando perfil no Supabase para o ID:", currentUserId);
        const { data: userData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUserId)
          .single();

        if (userData && !error) {
          const profile = userData as Profile;
          console.log("[AdminDashboard] Perfil retornado do Supabase:", profile);
          if (profile.role === 'cliente') {
            console.warn("[AdminDashboard] Perfil é de cliente. Redirecionando para /agendar");
            navigate('/agendar');
          } else {
            console.log("[AdminDashboard] Acesso concedido para o perfil.");
            // Se for e-mail de suporte, força a role como 'adm' no frontend para garantir
            const normalizedEmail = userEmail.trim().toLowerCase();
            if (normalizedEmail === 'admin@captain.com' || normalizedEmail === 'admin@admin.com') {
              profile.role = 'adm';
            }
            setCurrentUser(profile);
          }
        } else {
          if (error) {
            console.warn("[AdminDashboard] Erro na consulta do perfil:", error.message, error.details);
          }

          // Fallback pelo e-mail salvo no localStorage para os administradores principais
          const rawEmail = localStorage.getItem('captain_user_email');
          const userEmail = rawEmail ? rawEmail.trim().toLowerCase() : '';
          console.log("[AdminDashboard] Tentando fallback com e-mail:", userEmail);
          
          if (userEmail === 'admin@captain.com' || userEmail === 'admin@admin.com') {
            console.log("[AdminDashboard] Fallback ativado com sucesso para:", userEmail);
            setCurrentUser({
              id: currentUserId || '99',
              nome: 'Administrador Suporte',
              role: 'adm',
              telefone: '11999999999'
            });
          } else {
            // Fallback para mock profiles (ex: admin suporte '99')
            const mockUser = MOCK_PROFILES.find(p => p.id === currentUserId);
            if (mockUser) {
              console.log("[AdminDashboard] Fallback de ID Mock ativado:", mockUser);
              setCurrentUser(mockUser);
            } else {
              console.warn("[AdminDashboard] Sem credenciais válidas ou fallback. Redirecionando para login.");
              localStorage.removeItem('captain_user_id');
              localStorage.removeItem('captain_user_email');
              navigate('/login');
            }
          }
        }
      } catch (err) {
        console.error("[AdminDashboard] Erro crítico ao carregar perfil do usuário:", err);
        localStorage.removeItem('captain_user_id');
        localStorage.removeItem('captain_user_email');
        navigate('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [currentUserId, navigate]);

  // Busca e Realtime dos Agendamentos e Equipe
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const mocks = JSON.parse(localStorage.getItem('captain_mock_agendamentos') || '[]');
      setAgendamentos(mocks);
      setEquipe(MOCK_PROFILES.filter(p => p.role === 'barbeiro' || p.role === 'dono' || p.role === 'adm'));
      return;
    }

    const fetchData = async () => {
      const { data: agData } = await supabase.from('agendamentos').select('*');
      if (agData) setAgendamentos(agData as Agendamento[]);

      const { data: eqData } = await supabase.from('profiles').select('*').in('role', ['barbeiro', 'dono', 'adm']);
      if (eqData) setEquipe(eqData as Profile[]);
    };

    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        (payload) => {
          console.log("Realtime update:", payload);
          // O ideal é buscar apenas o agendamento alterado, mas recarregar tudo é mais simples pro demo
          supabase.from('agendamentos').select('*').then(({data}) => {
            if (data) setAgendamentos(data as Agendamento[]);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('captain_user_id');
    localStorage.removeItem('captain_user_email');
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

    const barbeiroNome = equipe.find(e => e.id === selectedBarbeiroId)?.nome || 'Profissional';
    const dataFormatada = format(selectedTimeSlot, "dd/MM 'às' HH:mm");

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('agendamentos').insert([newAgendamento]);
      if (error) {
        console.error("Erro ao inserir:", error);
      } else {
        await logEvent(
          'booking_created_admin',
          `Agendamento criado por Administrador: Cliente ${clienteNome} marcou ${servico} com o profissional ${barbeiroNome} para o dia ${dataFormatada}`,
          currentUser?.id,
          localStorage.getItem('captain_user_email')
        );
      }
    } else {
      // MOCK
      const mockAgendamento: Agendamento = {
        ...newAgendamento,
        id: Math.random().toString(36).substring(7)
      };
      setAgendamentos((prev) => {
        const updated = [...prev, mockAgendamento];
        localStorage.setItem('captain_mock_agendamentos', JSON.stringify(updated));
        return updated;
      });
      await logEvent(
        'booking_created_admin',
        `Agendamento criado por Administrador (Mock): Cliente ${clienteNome} marcou ${servico} com o profissional ${barbeiroNome} para o dia ${dataFormatada}`,
        currentUser?.id,
        localStorage.getItem('captain_user_email')
      );
    }
    
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (agendamento: Agendamento, novoStatus: 'Confirmado' | 'Cancelado') => {
    // 1. Atualizar
    if (isSupabaseConfigured) {
      await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamento.id);
      await logEvent(
        'booking_status_updated',
        `Status do agendamento de ${agendamento.cliente_nome} alterado para ${novoStatus} por ${currentUser?.nome || 'Administrador'}`,
        currentUser?.id,
        localStorage.getItem('captain_user_email')
      );
      // O realtime fará o fetchAgendamentos() recarregar a tela
    } else {
      setAgendamentos(prev => {
        const updated = prev.map(a => a.id === agendamento.id ? { ...a, status: novoStatus } : a);
        localStorage.setItem('captain_mock_agendamentos', JSON.stringify(updated));
        return updated;
      });
      await logEvent(
        'booking_status_updated',
        `Status do agendamento de ${agendamento.cliente_nome} alterado para ${novoStatus} (Mock) por ${currentUser?.nome || 'Administrador'}`,
        currentUser?.id,
        localStorage.getItem('captain_user_email')
      );
    }

    // 2. WhatsApp
    if (agendamento.cliente_telefone) {
      const numeroLimpo = agendamento.cliente_telefone.replace(/\D/g, '');
      const dataFormatada = format(parseISO(agendamento.data_hora), "dd/MM 'às' HH:mm");
      let mensagem = '';
      
      if (novoStatus === 'Confirmado') {
        mensagem = `Olá ${agendamento.cliente_nome}! Seu agendamento de ${agendamento.servico} para o dia ${dataFormatada} foi *CONFIRMADO*! Te esperamos na Captain Barbearia. ⚓✂️`;
      } else {
        mensagem = `Olá ${agendamento.cliente_nome}. Infelizmente não poderemos te atender no dia ${dataFormatada} e seu agendamento precisou ser *Cancelado*. Pedimos desculpas pelo transtorno. Acesse nosso app para escolher um novo horário! ⚓🙏`;
      }

      window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
    } else {
      alert(`Status atualizado para ${novoStatus}, mas o cliente não tem telefone salvo para o WhatsApp.`);
    }
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

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bronze-main"></div>
        <p className="mt-4 text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">Carregando painel...</p>
      </div>
    );
  }

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
        
        {activeTab === 'stats' && (currentUser.role === 'dono' || currentUser.role === 'adm') ? (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <FinancialDashboard currentUser={currentUser} agendamentos={agendamentos} />
          </div>
        ) : activeTab === 'equipe' && (currentUser.role === 'dono' || currentUser.role === 'adm') ? (
          <TeamManagement currentUser={currentUser} />
        ) : activeTab === 'logs' && isSupport ? (
          <SystemLogs />
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
                  {equipe.map(profile => (
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
                  if (a.status === 'Cancelado') return false; // Libera o horário na grade se foi cancelado
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
                        <div className={cn("p-3 rounded-xl border shadow-inner",
                          agendamento.status === 'Confirmado' ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50" :
                          "bg-zinc-50 dark:bg-graphite-main border-zinc-100 dark:border-zinc-700/50"
                        )}>
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-zinc-800 dark:text-white tracking-wide">
                              {agendamento.cliente_nome}
                            </p>
                            <span className="text-[10px] uppercase tracking-widest bg-bronze-main/10 text-bronze-main px-2 py-1 rounded-md border border-bronze-main/20">
                              {agendamento.servico}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              agendamento.status === 'Confirmado' ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                            )}>
                              {agendamento.status || 'Pendente'}
                            </span>
                            
                            {(!agendamento.status || agendamento.status === 'Pendente') && (
                              <div className="flex space-x-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agendamento, 'Cancelado'); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                                  title="Recusar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agendamento, 'Confirmado'); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors"
                                  title="Aceitar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            )}
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
        
        {(currentUser.role === 'dono' || currentUser.role === 'adm') && (
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
        )}
        
        {(currentUser.role === 'dono' || currentUser.role === 'adm') && (
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

        {isSupport && (
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-3 rounded-2xl transition-all duration-300",
              activeTab === 'logs' 
                ? "text-bronze-main bg-bronze-main/10" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <ShieldAlert className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Logs</span>
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
