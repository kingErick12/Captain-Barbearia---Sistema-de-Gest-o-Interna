import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, Phone } from 'lucide-react';
import { MOCK_PROFILES, isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { cn } from '../lib/utils';

export function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const routeUser = (profileId: string) => {
    localStorage.setItem('captain_user_id', profileId);
    
    // Buscar o role para saber pra onde mandar
    const user = MOCK_PROFILES.find(p => p.id === profileId);
    if (user?.role === 'cliente') {
      navigate('/agendar');
    } else {
      navigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        if (isSignUp) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                nome,
                telefone,
                role: 'cliente' // Por padrão, quem se cadastra pela tela é cliente
              }
            }
          });

          if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
          } else if (data.user) {
            // Aqui a trigger no banco deve criar o profile. Assumimos sucesso.
            // Na vida real precisaria esperar a trigger ou ler da db.
            localStorage.setItem('captain_user_id', data.user.id);
            navigate('/agendar'); // Novo usuário é cliente
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            setError(signInError.message);
            setLoading(false);
          } else {
            // Pegar o role no banco real
            const profileId = data.user?.id;
            if (profileId) {
              const normalizedEmail = email.trim().toLowerCase();
              localStorage.setItem('captain_user_id', profileId);
              localStorage.setItem('captain_user_email', normalizedEmail); // Salvar email para fallback seguro
              
              // Se for o email do admin/suporte, pula a validação de erro do perfil e manda direto para /admin
              if (normalizedEmail === 'admin@captain.com' || normalizedEmail === 'admin@admin.com') {
                console.log("Login: E-mail administrativo detectado:", normalizedEmail);
                navigate('/admin');
                return;
              }

              const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', profileId).single();
              if (profileError) {
                console.error("Erro ao carregar perfil no login:", profileError);
                setError("Erro ao carregar perfil: " + profileError.message);
                localStorage.removeItem('captain_user_id');
                localStorage.removeItem('captain_user_email');
                setLoading(false);
                return;
              }
              if (profileData?.role === 'cliente') {
                navigate('/agendar');
              } else {
                navigate('/admin');
              }
            } else {
              setError("Usuário não encontrado.");
              setLoading(false);
            }
          }
        }
      } else {
        // MOCK LOGIC
        setTimeout(() => {
          try {
            if (isSignUp) {
              const mockUsers = JSON.parse(localStorage.getItem('captain_mock_users') || '{}');
              if (mockUsers[email]) {
                setError("E-mail já cadastrado.");
              } else {
                // Criamos um id mockado e adicionamos em runtime no array (na memória/localstorage)
                const newId = Math.random().toString(36).substring(7);
                const newProfile: Profile = {
                  id: newId,
                  nome,
                  role: 'cliente',
                  telefone
                };
                MOCK_PROFILES.push(newProfile); // Hack pro mock em memória funcionar nesta sessão
                
                mockUsers[email] = { password, profileId: newId };
                localStorage.setItem('captain_mock_users', JSON.stringify(mockUsers));
                routeUser(newId);
              }
            } else {
              // No Mock, vamos facilitar pra logar os admins pre-cadastrados (1, 2, 3) 
              // ou clientes que acabaram de criar (no localstorage)
              const mockUsers = JSON.parse(localStorage.getItem('captain_mock_users') || '{}');
              const user = mockUsers[email];
              
              const normalizedEmail = email.trim().toLowerCase();
              if (user && user.password === password) {
                routeUser(user.profileId);
              } else if (normalizedEmail === 'admin@admin.com' || normalizedEmail === 'admin@captain.com') {
                routeUser('99'); // Admin Suporte
              } else {
                setError("E-mail ou senha inválidos. (Dica: tente admin@admin.com ou admin@captain.com para dono)");
              }
            }
          } catch (mockErr: any) {
            setError("Erro ao processar login mock: " + mockErr.message);
          } finally {
            setLoading(false);
          }
        }, 800);
      }
    } catch (err: any) {
      console.error("Erro no envio do formulário de login:", err);
      setError("Erro inesperado no envio: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center px-6">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-8 duration-700">
        <img 
          src="/logo.jpg" 
          alt="Captain Barbearia Logo" 
          className="w-24 h-24 rounded-full border-2 border-bronze-main shadow-[0_0_20px_rgba(197,160,89,0.3)] mb-4 object-cover cursor-pointer"
          onClick={() => navigate('/')} 
        />
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-widest uppercase text-shadow">Captain</h1>
      </div>

      {/* Form Container */}
      <div className="max-w-md w-full mx-auto bg-white/90 dark:bg-graphite-light/90 backdrop-blur-xl p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        
        <div className="flex justify-center mb-8 bg-zinc-100 dark:bg-graphite-main p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
              !isSignUp ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Entrar
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
              isSignUp ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium flex items-center border border-red-200 dark:border-red-800/50">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {isSignUp && (
            <>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required={isSignUp}
                    className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                  WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    required={isSignUp}
                    className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium ml-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium ml-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                minLength={6}
                className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!isSignUp && (!email || !password))}
            className="w-full py-4 mt-6 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 bg-bronze-main text-graphite-main hover:bg-bronze-light shadow-[0_0_20px_rgba(197,160,89,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Aguarde..." : (isSignUp ? "Criar Conta" : "Acessar")}
          </button>
        </form>
      </div>
    </div>
  );
}
