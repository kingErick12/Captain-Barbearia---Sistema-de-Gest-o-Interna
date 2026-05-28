-- Excluir tabelas se já existirem (cuidado em PRD, usar para sandbox limpo)
-- DROP TABLE IF EXISTS agendamentos;
-- DROP TABLE IF EXISTS profiles;

-- Criar tabela de Profiles (Perfis) - Atrelada ao user id real do Supabase
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('adm', 'dono', 'barbeiro', 'cliente')),
    telefone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar tabela de Agendamentos
CREATE TABLE agendamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    cliente_nome TEXT NOT NULL,
    servico TEXT NOT NULL CHECK (servico IN ('Corte', 'Barba', 'Combo')),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    barbeiro_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Configurar Row Level Security (RLS) policies
-- 1. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para Profiles (Qualquer pessoa autenticada pode ler seu próprio e dos outros no sistema)
CREATE POLICY "Profiles são visíveis para todos os usuários autenticados" 
ON profiles FOR SELECT TO authenticated USING (true);

-- 3. Políticas para Agendamentos
-- Visualização
CREATE POLICY "Agendamentos visíveis para todos usuários" 
ON agendamentos FOR SELECT TO authenticated USING (true);

-- Criação: Qualquer autenticado pode criar agendamentos
CREATE POLICY "Qualquer um logado pode criar agendamentos" 
ON agendamentos FOR INSERT TO authenticated WITH CHECK (true);

-- Atualização/Exclusão
CREATE POLICY "Autenticados podem editar agendamentos" 
ON agendamentos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem deletar agendamentos" 
ON agendamentos FOR DELETE TO authenticated USING (true);

-- Ativar realtime para agendamentos
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table agendamentos;

-- Trigger para criar o perfil do usuário automaticamente após o cadastro no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, telefone)
  VALUES (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'nome', 'Cliente'),
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    new.raw_user_meta_data->>'telefone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- MIGRAÇÕES DE ATUALIZAÇÃO (Para rodar em bancos de dados já existentes)
-- =========================================================================

-- 1. Atualizar a restrição de papéis (roles) para suportar 'adm'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('adm', 'dono', 'barbeiro', 'cliente'));

-- 2. Criar tabela de Logs de Eventos do Sistema
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id UUID,
    user_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS para system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS para system_logs (segurança de leitura restrita ao suporte)
DROP POLICY IF EXISTS "Permitir inserção de logs para todos" ON public.system_logs;
CREATE POLICY "Permitir inserção de logs para todos" 
ON public.system_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas suporte pode visualizar logs" ON public.system_logs;
CREATE POLICY "Apenas suporte pode visualizar logs" 
ON public.system_logs FOR SELECT TO authenticated 
USING (
  auth.jwt() ->> 'email' IN ('admin@captain.com', 'admin@admin.com') OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id::text = auth.uid()::text AND role = 'adm'
  )
);
