import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, setHours, setMinutes, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scissors, CheckCircle, ChevronLeft, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured, MOCK_PROFILES, logEvent } from '../lib/supabase';
import type { Agendamento, Profile } from '../lib/supabase';
import { cn } from '../lib/utils';

export function ClientBooking() {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('captain_user_id');
  
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [barbeiros, setBarbeiros] = useState<Profile[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fluxo de seleção
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Barbeiro, 2: Serviço, 3: Data/Hora, 4: Sucesso
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string>('');
  const [selectedServico, setSelectedServico] = useState<'Corte' | 'Barba' | 'Combo' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  // Load Data
  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    if (!isSupabaseConfigured) {
      const user = MOCK_PROFILES.find(p => p.id === currentUserId);
      if (user) {
        setCurrentUser(user);
      }
      setBarbeiros(MOCK_PROFILES.filter(p => p.role === 'barbeiro' || p.role === 'dono'));
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

    const newAgendamento = {
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
      current.push({ ...newAgendamento, id: Math.random().toString(36).substring(7) });
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
    <div className="min-h-screen bg-zinc-50 dark:bg-graphite-dark pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-graphite-light/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between">
        {step > 1 && step < 4 ? (
          <button onClick={() => setStep(prev => prev - 1 as any)} className="p-2 -ml-2 text-zinc-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10"></div> // Placeholder for balance
        )}
        <h1 className="text-lg font-bold uppercase tracking-widest text-zinc-900 dark:text-white">Agendar</h1>
        <button onClick={() => { localStorage.removeItem('captain_user_id'); navigate('/'); }} className="p-2 text-zinc-500">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        
        {/* Step 1: Barbeiro */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-4">1. Escolha o Profissional</h2>
            <div className="space-y-3">
              {barbeiros.map(barbeiro => (
                <button
                  key={barbeiro.id}
                  onClick={() => { setSelectedBarbeiro(barbeiro.id); setStep(2); }}
                  className="w-full bg-white dark:bg-graphite-light p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm hover:border-bronze-main transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-lg text-zinc-500 dark:text-zinc-400 uppercase">
                      {barbeiro.nome[0]}
                    </div>
                    <span className="font-bold text-lg text-zinc-900 dark:text-white">{barbeiro.nome}</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 rotate-180 text-zinc-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Serviço */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-4">2. Qual Serviço?</h2>
            <div className="grid grid-cols-1 gap-4">
              {(['Corte', 'Barba', 'Combo'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSelectedServico(s); setStep(3); }}
                  className="w-full bg-white dark:bg-graphite-light p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center shadow-sm hover:border-bronze-main transition-all"
                >
                  <div className="bg-bronze-main/10 p-3 rounded-xl mr-4">
                    <Scissors className="w-6 h-6 text-bronze-main" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-lg text-zinc-900 dark:text-white uppercase">{s}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Data e Hora */}
        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-4">3. Data e Hora</h2>
            
            <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
              {[0, 1, 2, 3, 4, 5, 6].map(d => {
                const date = addDays(new Date(), d);
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border min-w-[70px] transition-all",
                      isSameDay(date, selectedDate)
                        ? "bg-bronze-main text-graphite-dark border-bronze-main shadow-md"
                        : "bg-white dark:bg-graphite-light text-zinc-500 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    <span className="text-xs uppercase font-bold">{format(date, 'EEE', { locale: ptBR })}</span>
                    <span className="text-xl font-black">{format(date, 'dd')}</span>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {timeSlots.map((time, idx) => {
                // Verificar se está ocupado
                const ocupado = agendamentos.some(a => {
                  if (a.barbeiro_id !== selectedBarbeiro) return false;
                  const ad = parseISO(a.data_hora);
                  return isSameDay(ad, time) && ad.getHours() === time.getHours() && ad.getMinutes() === time.getMinutes();
                });

                return (
                  <button
                    key={idx}
                    disabled={ocupado}
                    onClick={() => setSelectedTimeSlot(time)}
                    className={cn(
                      "p-3 rounded-xl text-center font-bold text-sm transition-all border",
                      ocupado 
                        ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border-transparent opacity-50 cursor-not-allowed"
                        : selectedTimeSlot && time.getTime() === selectedTimeSlot.getTime()
                          ? "bg-bronze-main text-graphite-dark border-bronze-main shadow-[0_0_15px_rgba(197,160,89,0.3)]"
                          : "bg-white dark:bg-graphite-light border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-bronze-main"
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
              className="w-full py-4 mt-8 bg-bronze-main text-graphite-dark font-black uppercase tracking-widest rounded-2xl shadow-lg disabled:opacity-50 transition-all"
            >
              Confirmar Agendamento
            </button>
          </div>
        )}

        {/* Step 4: Sucesso */}
        {step === 4 && (
          <div className="animate-in zoom-in-95 duration-500 text-center py-12">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-2">
              Agendado!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 px-4">
              Seu horário está confirmado. Você receberá uma notificação em breve.
            </p>
            <button
              onClick={() => { setStep(1); setSelectedTimeSlot(null); navigate('/'); }}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold uppercase tracking-widest rounded-2xl"
            >
              Voltar ao Início
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
