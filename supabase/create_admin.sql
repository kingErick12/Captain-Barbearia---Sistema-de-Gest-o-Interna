-- ==========================================
-- SCRIPT PARA RECRIAR USUÁRIO ADMINISTRADOR NO SUPABASE (COMPATIBILIDADE TEXT/UUID)
-- Execute este script no SQL Editor do seu painel do Supabase.
-- ==========================================

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    admin_email TEXT := 'admin@captain.com'; -- E-mail de acesso
    admin_password TEXT := 'SenhaAdm123!';    -- Senha de acesso
    admin_nome TEXT := 'Administrador Suporte';
    admin_telefone TEXT := '11999999999';
BEGIN
    -- 1. Limpar cadastros anteriores com esse e-mail (usando cast explicito para texto para compatibilidade)
    DELETE FROM public.profiles WHERE id::text IN (SELECT id::text FROM auth.users WHERE email = admin_email);
    DELETE FROM auth.users WHERE email = admin_email;

    -- 2. Inserir na autenticação interna do Supabase (auth.users)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('nome', admin_nome, 'role', 'dono', 'telefone', admin_telefone),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 3. Inserir na tabela pública de profiles (com suporte a conflitos se o trigger já tiver inserido)
    INSERT INTO public.profiles (
        id,
        nome,
        role,
        telefone
    ) VALUES (
        new_user_id,
        admin_nome,
        'dono',
        admin_telefone
    )
    ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        role = EXCLUDED.role,
        telefone = EXCLUDED.telefone;

    RAISE NOTICE 'Usuário administrador recriado com sucesso! E-mail: %, Senha: %', admin_email, admin_password;
END $$;
