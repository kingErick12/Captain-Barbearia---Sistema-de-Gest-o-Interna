import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';
import { MOCK_PROFILES, isSupabaseConfigured, supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSupabaseConfigured) {
      if (isSignUp) {
        if (!selectedProfileId) {
          setError("Selecione um perfil para se cadastrar.");
          setLoading(false);
          return;
        }
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              profile_id: selectedProfileId
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          // If successful, simulate login setup or inform user
          localStorage.setItem('captain_user_id', selectedProfileId);
          navigate('/dashboard');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          // Need to fetch user's profile ID from auth metadata
          const profileId = data.user?.user_metadata?.profile_id || '1'; // Fallback
          localStorage.setItem('captain_user_id', profileId);
          navigate('/dashboard');
        }
      }
    } else {
      // MOCK LOGIC
      setTimeout(() => {
        if (isSignUp) {
          if (!selectedProfileId) {
            setError("Selecione um perfil.");
            setLoading(false);
            return;
          }
          const mockUsers = JSON.parse(localStorage.getItem('captain_mock_users') || '{}');
          if (mockUsers[email]) {
            setError("E-mail já cadastrado.");
          } else {
            mockUsers[email] = { password, profileId: selectedProfileId };
            localStorage.setItem('captain_mock_users', JSON.stringify(mockUsers));
            localStorage.setItem('captain_user_id', selectedProfileId);
            navigate('/dashboard');
          }
        } else {
          const mockUsers = JSON.parse(localStorage.getItem('captain_mock_users') || '{}');
          const user = mockUsers[email];
          if (user && user.password === password) {
            localStorage.setItem('captain_user_id', user.profileId);
            navigate('/dashboard');
          } else {
            setError("E-mail ou senha inválidos.");
          }
        }
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center px-6">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-8 duration-700">
        <img 
          src="/logo.jpg" 
          alt="Captain Barbearia Logo" 
          className="w-24 h-24 rounded-full border-2 border-bronze-main shadow-[0_0_20px_rgba(197,160,89,0.3)] mb-4 object-cover" 
        />
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-widest uppercase text-shadow">Captain</h1>
        <h2 className="text-xl text-bronze-main tracking-widest uppercase mt-1 text-shadow">Barbearia</h2>
      </div>

      {/* Form Container */}
      <div className="max-w-md w-full mx-auto bg-white/90 dark:bg-graphite-light/90 backdrop-blur-xl p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        
        <div className="flex justify-center mb-8 bg-zinc-100 dark:bg-graphite-main p-1 rounded-xl">
          <button 
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
              !isSignUp ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Entrar
          </button>
          <button 
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
              isSignUp ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium flex items-center border border-red-200 dark:border-red-800/50">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                Sou o...
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main focus:ring-1 focus:ring-bronze-main outline-none transition-all appearance-none"
                >
                  <option value="" disabled>Selecione seu perfil</option>
                  {MOCK_PROFILES.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.role})</option>
                  ))}
                </select>
              </div>
            </div>
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
                className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main focus:ring-1 focus:ring-bronze-main outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
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
                className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main focus:ring-1 focus:ring-bronze-main outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!isSignUp && (!email || !password))}
            className="w-full py-4 mt-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 bg-bronze-main text-graphite-main hover:bg-bronze-light shadow-[0_0_20px_rgba(197,160,89,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Aguarde..." : (isSignUp ? "Criar Conta" : "Acessar Sistema")}
          </button>
        </form>
      </div>

      {/* PWA Install Instructions */}
      <div className="max-w-md w-full mx-auto mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            📱 <strong className="text-zinc-800 dark:text-zinc-200">Como instalar este App:</strong>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 leading-relaxed">
            No <strong>iOS (Safari)</strong>: Toque em <em>Compartilhar</em> e depois <em>'Adicionar à Tela de Início'</em>.<br/>
            No <strong>Android (Chrome)</strong>: Toque em <em>Opções (3 pontos)</em> e <em>'Instalar Aplicativo'</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
