import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl || "http://mock-url.com", supabaseAnonKey || "mock-key");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type Profile = {
  id: string; // no supabase, it maps to auth.users id
  nome: string;
  role: 'adm' | 'dono' | 'barbeiro' | 'cliente';
  telefone?: string;
  avatar_url?: string;
}

export type Agendamento = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone?: string;
  servico: 'Corte' | 'Barba' | 'Combo';
  data_hora: string;
  barbeiro_id: string;
  status?: 'Pendente' | 'Confirmado' | 'Cancelado';
}

export type SystemLog = {
  id: string;
  event_type: string;
  description: string;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

// Para registrar ações relevantes no sistema (logs de auditoria)
export async function logEvent(
  eventType: string, 
  description: string, 
  userId?: string | null, 
  userEmail?: string | null
) {
  if (!isSupabaseConfigured) {
    console.log(`[MOCK LOG] [${eventType}]: ${description}`);
    try {
      const logs = JSON.parse(localStorage.getItem('captain_mock_logs') || '[]');
      logs.unshift({
        id: Math.random().toString(36).substring(7),
        event_type: eventType,
        description,
        user_id: userId || null,
        user_email: userEmail || null,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('captain_mock_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error("Erro ao salvar logs de simulação (mock):", e);
    }
    return;
  }

  try {
    const { error } = await supabase.from('system_logs').insert([{
      event_type: eventType,
      description,
      user_id: userId || null,
      user_email: userEmail || null
    }]);
    if (error) {
      console.error("Erro ao inserir log no Supabase:", error);
    }
  } catch (err) {
    console.error("Erro ao registrar log de eventos:", err);
  }
}

// Para facilitar o MOCK Inicial (sem backend real acoplado)
export const MOCK_PROFILES: Profile[] = [
  { id: '99', nome: 'Admin / Suporte', role: 'adm', telefone: '11900000000' },
];
