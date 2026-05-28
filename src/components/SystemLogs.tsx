import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SystemLog } from '../lib/supabase';
import { RefreshCw, Search, Shield, Calendar, Mail, FileText, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'access' | 'signup' | 'bookings' | 'team'>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      // Mock Fallback
      setTimeout(() => {
        try {
          const mockLogs = JSON.parse(localStorage.getItem('captain_mock_logs') || '[]');
          setLogs(mockLogs);
        } catch (e: any) {
          setError('Erro ao carregar logs simulados: ' + e.message);
        } finally {
          setLoading(false);
        }
      }, 600);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        console.error("Erro RLS/Leitura de Logs:", fetchErr);
        setError('Acesso Negado ou erro de carregamento: ' + fetchErr.message);
      } else if (data) {
        setLogs(data as SystemLog[]);
      }
    } catch (err: any) {
      console.error("Erro inesperado ao buscar logs:", err);
      setError('Erro inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'login':
      case 'login_admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'signup':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'booking_created':
      case 'booking_created_admin':
      case 'booking_status_updated':
        return 'bg-bronze-main/10 text-bronze-main border-bronze-main/20 dark:border-bronze-main/30';
      case 'team_member_added':
      case 'team_member_deleted':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'login': return 'Login';
      case 'login_admin': return 'Login Admin';
      case 'signup': return 'Cadastro';
      case 'booking_created': return 'Agendamento';
      case 'booking_created_admin': return 'Agendamento Admin';
      case 'booking_status_updated': return 'Status Agendamento';
      case 'team_member_added': return 'Adição Equipe';
      case 'team_member_deleted': return 'Exclusão Equipe';
      default: return type;
    }
  };

  // Filtragem dos logs
  const filteredLogs = logs.filter(log => {
    // Filtro de Categoria
    if (categoryFilter === 'access' && !['login', 'login_admin'].includes(log.event_type)) return false;
    if (categoryFilter === 'signup' && log.event_type !== 'signup') return false;
    if (categoryFilter === 'bookings' && !['booking_created', 'booking_created_admin', 'booking_status_updated'].includes(log.event_type)) return false;
    if (categoryFilter === 'team' && !['team_member_added', 'team_member_deleted'].includes(log.event_type)) return false;

    // Filtro de Busca por texto
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchDescription = log.description?.toLowerCase().includes(term);
      const matchEmail = log.user_email?.toLowerCase().includes(term);
      const matchType = log.event_type?.toLowerCase().includes(term);
      return matchDescription || matchEmail || matchType;
    }

    return true;
  });

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 dark:bg-graphite-light p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex items-center">
          <div className="bg-red-500/10 p-3 rounded-xl mr-4 border border-red-500/20">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
              Logs do Sistema
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Auditoria interna de eventos de segurança e negócios (exclusivo suporte)
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-graphite-main text-zinc-700 dark:text-zinc-300 hover:border-bronze-main transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Erro de Acesso / Carregamento */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-200 dark:border-red-800/40">
          {error}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white/90 dark:bg-graphite-light p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        
        {/* Campo de Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por e-mail, ação, descrição..."
            className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-sm font-medium transition-all"
          />
        </div>

        {/* Filtros de Categoria */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs sm:text-sm">
          {[
            { id: 'all', label: 'Todos', icon: Activity },
            { id: 'access', label: 'Acesso/Login', icon: Mail },
            { id: 'signup', label: 'Cadastros', icon: FileText },
            { id: 'bookings', label: 'Agendamentos', icon: Calendar },
            { id: 'team', label: 'Equipe', icon: Shield },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-bronze-main text-zinc-900 border-bronze-main shadow-sm'
                    : 'bg-zinc-100 dark:bg-graphite-main text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white/90 dark:bg-graphite-light rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center">
            <RefreshCw className="w-8 h-8 text-bronze-main animate-spin mb-4" />
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Carregando logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Nenhum evento registrado com esses filtros.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[500px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-graphite-main/50 transition-colors"
              >
                {/* Informações Principais */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge do Tipo de Evento */}
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getEventBadgeColor(log.event_type)}`}>
                      {getEventLabel(log.event_type)}
                    </span>
                    
                    {/* E-mail do Usuário */}
                    {log.user_email && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {log.user_email}
                      </span>
                    )}
                  </div>

                  {/* Descrição */}
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {log.description}
                  </p>
                </div>

                {/* Data e Hora */}
                <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {format(parseISO(log.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                    {format(parseISO(log.created_at), "HH:mm:ss")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
