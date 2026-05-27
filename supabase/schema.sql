-- Excluir tabelas se já existirem (cuidado em PRD, usar para sandbox limpo)
-- DROP TABLE IF EXISTS agendamentos;
-- DROP TABLE IF EXISTS profiles;

-- Criar tabela de Profiles (Perfis) - Atrelada ao user id real do Supabase
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dono', 'barbeiro', 'cliente')),
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
