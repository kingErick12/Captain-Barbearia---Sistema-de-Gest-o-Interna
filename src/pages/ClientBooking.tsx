import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, setHours, setMinutes, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scissors, CheckCircle, ChevronLeft, LogOut, User, Sparkles, Clock, Calendar, CalendarRange, MessageSquare, Star } from 'lucide-react';
import { supabase, isSupabaseConfigured, MOCK_PROFILES, logEvent } from '../lib/supabase';
import type { Agendamento, Profile } from '../lib/supabase';
import { cn } from '../lib/utils';
const BARBEIRO_INFO: Record<string, { desc: string; badge: string; rating: string }> = {
  'Joao silva': { desc: 'Especialista em degradê moderno, barba express e cortes clássicos com acabamento na navalha.', badge: 'Mestre Barbeiro', rating: '4.9 (180 avaliações)' },
  'Erick (Dono)': { desc: 'Fundador da Captain. Cortes de alta precisão e rituais tradicionais de toalha quente.', badge: 'Barbeiro Proprietário', rating: '5.0 (250 avaliações)' },
  'Administrador Suporte': { desc: 'Especialista em visagismo masculino, cortes estilizados e desenhos artísticos.', badge: 'Barbeiro Estilista', rating: '4.8 (90 avaliações)' }
};

const SERVICO_INFO = {
  'Corte': { price: 40, duration: '40 min', desc: 'Corte de cabelo moderno ou clássico com lavagem e acabamento detalhado na navalha.' },
  'Barba': { price: 30, duration: '30 min', desc: 'Barboterapia clássica com toalha quente, massagem facial e óleos hidratantes.' },
  'Combo': { price: 65, duration: '70 min', desc: 'O ritual completo: corte premium + barba com toalha quente e economia especial.' }
};

const getBarberMeta = (name: string) => {
  return BARBEIRO_INFO[name] || {
    desc: 'Profissional especialista em cortes masculinos, modelagem de barba e tratamentos.',
    badge: 'Barbeiro Profissional',
    rating: '4.8 (50 avaliações)'
  };
};

export function ClientBooking() {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('captain_user_id');
  
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    if (!isSupabaseConfigured) {
      return MOCK_PROFILES.find(p => p.id === currentUserId) || null;
    }
    return null;
  });
  const [barbeiros, setBarbeiros] = useState<Profile[]>(() => {
    if (!isSupabaseConfigured) {
      return MOCK_PROFILES.filter(p => p.role === 'barbeiro' || p.role === 'dono');
    }
    return [];
  });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Abas e Meus Horários
  const [activeView, setActiveView] = useState<'booking' | 'my_bookings'>('booking');
  const [myBookings, setMyBookings] = useState<Agendamento[]>([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);

  // Fluxo de seleção
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Barbeiro, 2: Serviço, 3: Data/Hora, 4: Sucesso
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string>('');
  const [selectedServico, setSelectedServico] = useState<'Corte' | 'Barba' | 'Combo' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  const fetchMyBookings = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingMyBookings(true);
    
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('cliente_id', currentUserId)
        .order('data_hora', { ascending: true });
        
      if (data && !error) {
        setMyBookings(data as Agendamento[]);
      } else {
        console.error("Erro ao carregar meus agendamentos:", error);
      }
    } else {
      const mocks = JSON.parse(localStorage.getItem('captain_mock_agendamentos') || '[]');
      const userMocks = mocks.filter((a: any) => a.cliente_id === currentUserId);
      setMyBookings(userMocks);
    }
    setLoadingMyBookings(false);
  }, [currentUserId]);

  const handleCancelBooking = async (booking: Agendamento) => {
    const dataFormatada = format(parseISO(booking.data_hora), "dd/MM 'às' HH:mm");
    const motivo = prompt(`Tem certeza de que deseja cancelar seu agendamento de ${booking.servico} para o dia ${dataFormatada}?\n\nPor favor, informe o motivo do cancelamento:`);
    
    if (motivo === null) {
      return; // Usuário cancelou o prompt
    }
    
    const motivoFinal = motivo.trim() || 'Não informado';
    setLoadingMyBookings(true);
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'Cancelado', motivo_cancelamento: motivoFinal })
        .eq('id', booking.id);
        
      if (error) {
        alert("Erro ao cancelar agendamento: " + error.message);
      } else {
        await logEvent(
          'booking_cancelled_client',
          `Cliente ${currentUser?.nome} cancelou agendamento de ${booking.servico} para o dia ${dataFormatada}. Motivo: ${motivoFinal}`,
          currentUserId,
          localStorage.getItem('captain_user_email')
        );
        // Atualiza a lista de "Meus Horários"
        await fetchMyBookings();
        // Libera localmente o horário para a aba "Agendar"
        setAgendamentos(prev => prev.map(a => a.id === booking.id ? { ...a, status: 'Cancelado', motivo_cancelamento: motivoFinal } : a));
        
        // Notificar via WhatsApp
        let barbeiro = barbeiros.find(b => b.id === booking.barbeiro_id);
        if (!barbeiro) {
          const { data } = await supabase.from('profiles').select('*').eq('id', booking.barbeiro_id).single();
          if (data) barbeiro = data as Profile;
        }
        if (barbeiro && barbeiro.telefone) {
          let numeroLimpo = barbeiro.telefone.replace(/\D/g, '');
          if (numeroLimpo.length === 11 || numeroLimpo.length === 10) {
            numeroLimpo = '55' + numeroLimpo;
          }
          const msg = `Olá ${barbeiro.nome}! Eu (*${currentUser?.nome || 'Cliente'}*) precisei *CANCELAR* o agendamento de *${booking.servico}* para o dia *${dataFormatada}*.\n\n*Motivo:* ${motivoFinal} ⚓🙏`;
          window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
          alert("Agendamento cancelado com sucesso! Contudo, o profissional não possui WhatsApp cadastrado.");
        }
      }
    } else {
      const mocks = JSON.parse(localStorage.getItem('captain_mock_agendamentos') || '[]');
      const updated = mocks.map((a: any) => a.id === booking.id ? { ...a, status: 'Cancelado', motivo_cancelamento: motivoFinal } : a);
      localStorage.setItem('captain_mock_agendamentos', JSON.stringify(updated));
      
      await logEvent(
        'booking_cancelled_client',
        `Cliente ${currentUser?.nome} cancelou agendamento (Mock) de ${booking.servico} para o dia ${dataFormatada}. Motivo: ${motivoFinal}`,
        currentUserId,
        localStorage.getItem('captain_user_email')
      );
      
      await fetchMyBookings();
      setAgendamentos(prev => prev.map(a => a.id === booking.id ? { ...a, status: 'Cancelado', motivo_cancelamento: motivoFinal } : a));
      
      // Notificar via WhatsApp (Mock)
      let barbeiro = barbeiros.find(b => b.id === booking.barbeiro_id);
      if (!barbeiro) {
        barbeiro = MOCK_PROFILES.find(p => p.id === booking.barbeiro_id);
      }
      if (barbeiro && barbeiro.telefone) {
        let numeroLimpo = barbeiro.telefone.replace(/\D/g, '');
        if (numeroLimpo.length === 11 || numeroLimpo.length === 10) {
          numeroLimpo = '55' + numeroLimpo;
        }
        const msg = `Olá ${barbeiro.nome}! Eu (*${currentUser?.nome || 'Cliente'}*) precisei *CANCELAR* o agendamento de *${booking.servico}* para o dia *${dataFormatada}*.\n\n*Motivo:* ${motivoFinal} (Mock) ⚓🙏`;
        window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        alert("Agendamento cancelado com sucesso (Simulado)! Contudo, o profissional não possui WhatsApp cadastrado.");
      }
    }
    setLoadingMyBookings(false);
  };

  useEffect(() => {
    if (activeView === 'my_bookings') {
      fetchMyBookings();
    }
  }, [activeView, fetchMyBookings]);

  // Load Data
  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const fetchPerfis = async () => {
      try {
        setLoading(true);
        // Pega o current user
        const { data: userData, error: userError } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();
        
        if (userData) {
          setCurrentUser(userData as Profile);
        } else {
          // Fallback pro mock se o dono ainda tiver o ID '99' na memoria mas n existir no banco
          const mockUser = MOCK_PROFILES.find(p => p.id === currentUserId);
          if (mockUser) {
            setCurrentUser(mockUser);
          } else {
            console.error("Perfil do usuário não encontrado na tabela public.profiles:", userError);
            // Limpar o ID inválido e redirecionar para o login para que o usuário não fique preso numa tela preta
            localStorage.removeItem('captain_user_id');
            localStorage.removeItem('captain_user_email');
            navigate('/login');
            return;
          }
        }

        // Pega a equipe (dono e barbeiros) para exibir na seleção
        const { data: equipeData } = await supabase.from('profiles').select('*').in('role', ['barbeiro', 'dono']);
        if (equipeData) setBarbeiros(equipeData as Profile[]);
      } catch (err) {
        console.error("Erro ao carregar dados do agendamento:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfis();
  }, [currentUserId, navigate]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      const fetchAgenda = async () => {
        const { data } = await supabase.from('agendamentos').select('*');
        if (data) setAgendamentos(data as Agendamento[]);
      };
      fetchAgenda();
    }
  }, []);

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots = [];
    let currentMinutes = 8 * 60; // 08:00
    const endMinutes = 19 * 60; // 19:00
    
    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(setMinutes(setHours(selectedDate, hours), mins));
      currentMinutes += 40; // Intervalo de 40 min
    }
    return slots;
  }, [selectedDate]);

  const handleConfirm = async () => {
    if (!selectedBarbeiro || !selectedServico || !selectedTimeSlot || !currentUser) return;

    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
    const newAgendamento = {
      id: generatedId,
      cliente_id: currentUser.id,
      cliente_nome: currentUser.nome,
      cliente_telefone: currentUser.telefone || '',
      servico: selectedServico,
      data_hora: selectedTimeSlot.toISOString(),
      barbeiro_id: selectedBarbeiro,
      status: 'Pendente'
    };

    const barbeiroNome = barbeiros.find(b => b.id === selectedBarbeiro)?.nome || 'Profissional';
    const dataFormatada = format(selectedTimeSlot, "dd/MM 'às' HH:mm");

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('agendamentos').insert([newAgendamento]);
      if (error) {
        console.error("Erro ao agendar:", error);
        alert("Erro ao realizar o agendamento no banco de dados: " + error.message);
        return;
      } else {
        await logEvent(
          'booking_created', 
          `Agendamento criado: Cliente ${currentUser.nome} marcou ${selectedServico} com o profissional ${barbeiroNome} para o dia ${dataFormatada}`,
          currentUser.id,
          localStorage.getItem('captain_user_email')
        );
      }
    } else {
      const current = JSON.parse(localStorage.getItem('captain_mock_agendamentos') || '[]');
      current.push({ ...newAgendamento, id: generatedId });
      localStorage.setItem('captain_mock_agendamentos', JSON.stringify(current));
      await logEvent(
        'booking_created', 
        `Agendamento criado (Mock): Cliente ${currentUser.nome} marcou ${selectedServico} com o profissional ${barbeiroNome} para o dia ${dataFormatada}`,
        currentUser.id,
        localStorage.getItem('captain_user_email')
      );
    }
    
    setStep(4);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-graphite-dark flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400 font-medium">Carregando...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-transparent pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-graphite-light/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between shadow-md">
        {activeView === 'booking' && step > 1 && step < 4 ? (
          <button onClick={() => setStep(prev => prev - 1 as any)} className="p-2 -ml-2 text-zinc-500 hover:text-bronze-main transition-colors cursor-pointer">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <div className="flex items-center space-x-2">
          <Scissors className="w-5 h-5 text-bronze-main rotate-90" />
          <h1 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white">Captain</h1>
        </div>
        <button onClick={() => { localStorage.removeItem('captain_user_id'); navigate('/'); }} className="p-2 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer" title="Sair">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Alternador de Abas */}
      {step < 4 && (
        <div className="max-w-md mx-auto px-4 mt-6">
          <div className="flex bg-zinc-200/50 dark:bg-graphite-light/50 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 shadow-inner">
            <button
              onClick={() => { setActiveView('booking'); setStep(1); }}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer",
                activeView === 'booking'
                  ? "bg-bronze-main text-graphite-dark shadow-lg scale-[1.02]"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350"
              )}
            >
              Agendar
            </button>
            <button
              onClick={() => setActiveView('my_bookings')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer",
                activeView === 'my_bookings'
                  ? "bg-bronze-main text-graphite-dark shadow-lg scale-[1.02]"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350"
              )}
            >
              Meus Horários
            </button>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 mt-6">
        {activeView === 'booking' ? (
          <div className="space-y-6">
            
            {/* Indicador de Progresso Visual de Passos */}
            {step < 4 && (
              <div className="flex justify-between items-center bg-white/60 dark:bg-graphite-light/60 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                {[
                  { s: 1, label: 'Barbeiro', icon: User },
                  { s: 2, label: 'Serviço', icon: Sparkles },
                  { s: 3, label: 'Horário', icon: Clock }
                ].map(item => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.s} className="flex items-center space-x-2 flex-1 justify-center first:justify-start last:justify-end">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300",
                        step === item.s 
                          ? "bg-bronze-main text-graphite-dark scale-110 shadow-lg shadow-bronze-main/20 ring-2 ring-bronze-main/30" 
                          : step > item.s 
                            ? "bg-green-600 text-white" 
                            : "bg-zinc-200 dark:bg-graphite-main text-zinc-500 dark:text-zinc-400"
                      )}>
                        {step > item.s ? '✓' : <IconComponent className="w-4 h-4" />}
                      </div>
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-black hidden xs:inline",
                        step === item.s ? "text-bronze-main" : "text-zinc-400 dark:text-zinc-500"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 1: Barbeiro */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-black flex items-center justify-center sm:justify-start">
                    <User className="w-4 h-4 mr-2 text-bronze-main" />
                    1. Escolha o Profissional
                  </h2>
                </div>
                <div className="space-y-4">
                  {barbeiros.map(barbeiro => {
                    const meta = getBarberMeta(barbeiro.nome);
                    return (
                      <button
                        key={barbeiro.id}
                        onClick={() => { setSelectedBarbeiro(barbeiro.id); setStep(2); }}
                        className="w-full text-left bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-start justify-between shadow-md hover:border-bronze-main hover:scale-[1.01] transition-all group cursor-pointer"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="w-14 h-14 bg-zinc-100 dark:bg-graphite-main rounded-2xl flex items-center justify-center font-black text-xl text-bronze-main uppercase border border-zinc-200 dark:border-zinc-800 shadow-inner shrink-0">
                            {barbeiro.nome[0]}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-base text-zinc-900 dark:text-white tracking-tight">{barbeiro.nome}</span>
                              <span className="text-[8px] uppercase font-bold bg-bronze-main/10 text-bronze-main px-2 py-0.5 rounded-md border border-bronze-main/20">
                                {meta.badge}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pr-2">
                              {meta.desc}
                            </p>
                            <div className="flex items-center text-[10px] text-amber-500 font-bold tracking-wider pt-1">
                              <Star className="w-3.5 h-3.5 fill-amber-500 mr-1 animate-pulse" />
                              {meta.rating}
                            </div>
                          </div>
                        </div>
                        <ChevronLeft className="w-5 h-5 rotate-180 text-zinc-400 group-hover:text-bronze-main transition-colors mt-4 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Serviço */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-black flex items-center justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 mr-2 text-bronze-main" />
                    2. Escolha o Serviço
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {(['Corte', 'Barba', 'Combo'] as const).map((s) => {
                    const info = SERVICO_INFO[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { setSelectedServico(s); setStep(3); }}
                        className="w-full text-left bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-start shadow-md hover:border-bronze-main hover:scale-[1.01] transition-all group cursor-pointer"
                      >
                        <div className="bg-bronze-main/10 p-3.5 rounded-2xl mr-4 shrink-0 border border-bronze-main/20 shadow-inner text-bronze-main">
                          <Scissors className="w-6 h-6 rotate-90" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-lg text-zinc-900 dark:text-white uppercase tracking-wider">{s}</span>
                            <span className="font-black text-base text-bronze-main">
                              R$ {info.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pr-2">
                            {info.desc}
                          </p>
                          <div className="flex items-center text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest pt-1">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Duração: {info.duration}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Data e Hora */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-black flex items-center justify-center sm:justify-start">
                    <Clock className="w-4 h-4 mr-2 text-bronze-main" />
                    3. Escolha Data e Hora
                  </h2>
                </div>
                
                <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                  {[0, 1, 2, 3, 4, 5, 6].map(d => {
                    const date = addDays(new Date(), d);
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border min-w-[70px] transition-all cursor-pointer",
                          isSelected
                            ? "bg-bronze-main text-graphite-dark border-bronze-main shadow-lg scale-105"
                            : "bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-650"
                        )}
                      >
                        <span className="text-[10px] uppercase font-black">{format(date, 'EEE', { locale: ptBR })}</span>
                        <span className="text-xl font-black mt-0.5">{format(date, 'dd')}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  {timeSlots.map((time, idx) => {
                    // Verificar se está ocupado
                    const ocupado = agendamentos.some(a => {
                      if (a.barbeiro_id !== selectedBarbeiro) return false;
                      if (a.status === 'Cancelado') return false;
                      const ad = parseISO(a.data_hora);
                      return isSameDay(ad, time) && ad.getHours() === time.getHours() && ad.getMinutes() === time.getMinutes();
                    });

                    // Verificar se o horário já passou (caso seja hoje)
                    const isPast = isSameDay(time, new Date()) && time.getTime() < new Date().getTime();
                    const ocupadoOuPassado = ocupado || isPast;
                    const isSelected = selectedTimeSlot && time.getTime() === selectedTimeSlot.getTime();

                    return (
                      <button
                        key={idx}
                        disabled={ocupadoOuPassado}
                        onClick={() => setSelectedTimeSlot(time)}
                        className={cn(
                          "p-3.5 rounded-2xl text-center font-black text-sm transition-all border cursor-pointer",
                          ocupadoOuPassado 
                            ? "bg-zinc-100 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-700 border-transparent opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "bg-bronze-main text-graphite-dark border-bronze-main shadow-lg scale-105"
                              : "bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-bronze-main"
                        )}
                      >
                        {format(time, 'HH:mm')}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedTimeSlot}
                  onClick={handleConfirm}
                  className="w-full py-4 mt-8 bg-bronze-main text-graphite-dark font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            )}

            {/* Step 4: Sucesso */}
            {step === 4 && (
              <div className="animate-in zoom-in-95 duration-500 text-center py-12 bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-2">
                  Agendado!
                </h2>
                <p className="text-zinc-550 dark:text-zinc-400 mb-8 px-4 text-xs leading-relaxed">
                  Seu horário está reservado com sucesso. Notifique o seu profissional via WhatsApp para agilizar a confirmação!
                </p>
                
                {/* Botão de notificar barbeiro */}
                {barbeiros.find(b => b.id === selectedBarbeiro)?.telefone && (
                  <button
                    onClick={() => {
                      const barbeiro = barbeiros.find(b => b.id === selectedBarbeiro);
                      if (barbeiro && selectedTimeSlot) {
                        let numeroLimpo = (barbeiro.telefone || '').replace(/\D/g, '');
                        if (numeroLimpo.length === 11 || numeroLimpo.length === 10) {
                          numeroLimpo = '55' + numeroLimpo;
                        }
                        const dataFormatada = format(selectedTimeSlot, "dd/MM 'às' HH:mm");
                        const msg = `Olá ${barbeiro.nome}! Acabei de fazer um agendamento de *${selectedServico}* para o dia *${dataFormatada}* no seu nome pelo aplicativo. ⚓✂️`;
                        window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
                      }
                    }}
                    className="w-full py-4 mb-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Avisar no WhatsApp</span>
                  </button>
                )}

                <button
                  onClick={() => { setStep(1); setSelectedTimeSlot(null); setActiveView('my_bookings'); }}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold uppercase tracking-widest rounded-2xl cursor-pointer"
                >
                  Ver Meus Horários
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Aba: Meus Horários */
          <div className="animate-in fade-in duration-300 space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-black flex items-center">
              <CalendarRange className="w-4 h-4 mr-2 text-bronze-main" />
              Seus Agendamentos
            </h2>

            {loadingMyBookings ? (
              <div className="py-12 text-center text-zinc-450 dark:text-zinc-500 font-medium flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-bronze-main mb-3"></div>
                Carregando seus compromissos...
              </div>
            ) : myBookings.length === 0 ? (
              <div className="bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center shadow-md space-y-4">
                <Calendar className="w-12 h-12 text-zinc-400 dark:text-zinc-650 mx-auto" />
                <div>
                  <h4 className="text-zinc-900 dark:text-white font-black uppercase text-sm">Nenhum agendamento</h4>
                  <p className="text-zinc-505 dark:text-zinc-400 text-xs mt-1">Você não possui nenhum horário marcado no momento.</p>
                </div>
                <button
                  onClick={() => setActiveView('booking')}
                  className="w-full py-3 bg-bronze-main text-graphite-dark font-black uppercase tracking-wider text-xs rounded-xl shadow-md cursor-pointer hover:scale-105 transition-all"
                >
                  Agendar Agora
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking) => {
                  const dataObj = parseISO(booking.data_hora);
                  const isCancelado = booking.status === 'Cancelado';
                  const isConfirmado = booking.status === 'Confirmado';
                  const barbeiroNome = barbeiros.find(b => b.id === booking.barbeiro_id)?.nome || 'Profissional';
                  
                  return (
                    <div 
                      key={booking.id} 
                      className={cn(
                        "bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-5 rounded-3xl border shadow-md space-y-4",
                        isCancelado 
                          ? "border-zinc-200 dark:border-zinc-900/50 opacity-70" 
                          : isConfirmado
                            ? "border-green-500/20 dark:border-green-500/10"
                            : "border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-black bg-bronze-main/10 text-bronze-main px-2 py-0.5 rounded-md border border-bronze-main/20">
                            {booking.servico}
                          </span>
                          <h4 className="font-black text-lg text-zinc-900 dark:text-white mt-1.5">
                            {format(dataObj, "dd 'de' MMMM", { locale: ptBR })}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Horário: <strong className="text-zinc-700 dark:text-zinc-300">{format(dataObj, 'HH:mm')}</strong>
                          </p>
                        </div>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                          isCancelado 
                            ? "bg-red-500/10 text-red-500 border-red-500/20" 
                            : isConfirmado
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {booking.status || 'Pendente'}
                        </span>
                      </div>

                      <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex flex-wrap justify-between items-center text-xs">
                        <span className="text-zinc-500">
                          Profissional: <strong className="text-zinc-700 dark:text-zinc-300">{barbeiroNome}</strong>
                        </span>
                        <span className="font-bold text-bronze-main">
                          R$ {(SERVICO_INFO[booking.servico as keyof typeof SERVICO_INFO]?.price || 0).toFixed(2)}
                        </span>
                      </div>

                      {isCancelado && booking.motivo_cancelamento && (
                        <div className="text-[11px] text-red-500/80 dark:text-red-450/90 italic bg-red-500/5 dark:bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                          <strong>Motivo:</strong> {booking.motivo_cancelamento}
                        </div>
                      )}

                      {!isCancelado && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="flex-1 py-2.5 border border-red-500/20 hover:bg-red-500/10 text-red-500 font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer text-center"
                          >
                            Cancelar
                          </button>
                          
                          {barbeiros.find(b => b.id === booking.barbeiro_id)?.telefone && (
                            <button
                              onClick={() => {
                                const barbeiro = barbeiros.find(b => b.id === booking.barbeiro_id);
                                if (barbeiro) {
                                  let numeroLimpo = (barbeiro.telefone || '').replace(/\D/g, '');
                                  if (numeroLimpo.length === 11 || numeroLimpo.length === 10) {
                                    numeroLimpo = '55' + numeroLimpo;
                                  }
                                  const dataFormatada = format(dataObj, "dd/MM 'às' HH:mm");
                                  const msg = `Olá ${barbeiro.nome}! Tenho um agendamento de *${booking.servico}* no dia *${dataFormatada}* no seu nome pelo app. Gostaria de tirar uma dúvida. ⚓✂️`;
                                  window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              }}
                              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
