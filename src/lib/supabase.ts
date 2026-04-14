import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl || "http://mock-url.com", supabaseAnonKey || "mock-key");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type Profile = {
  id: string; // no supabase, it maps to auth.users id
  nome: string;
  role: 'dono' | 'barbeiro';
  avatar_url?: string;
}

export type Agendamento = {
  id: string;
  cliente_nome: string;
  servico: 'Corte' | 'Barba' | 'Combo';
  data_hora: string;
  barbeiro_id: string;
}

// Para facilitar o MOCK Inicial (sem backend real acoplado)
// Esses serão os IDs simulados se o supa não estiver rodando.
export const MOCK_PROFILES: Profile[] = [
  { id: '1', nome: 'Pedro', role: 'dono' },
  { id: '2', nome: 'Menot', role: 'barbeiro' },
  { id: '3', nome: 'Kleber', role: 'barbeiro' },
  { id: '99', nome: 'Admin / Suporte', role: 'dono' },
];
