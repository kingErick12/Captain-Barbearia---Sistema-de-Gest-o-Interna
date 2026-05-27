import { useState } from 'react';
import { UserPlus, Mail, Phone, Lock, User, Shield, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, MOCK_PROFILES } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

export function TeamManagement() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'barbeiro' | 'dono'>('barbeiro');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [barbeiros, setBarbeiros] = useState<Profile[]>([]);

  // Buscar equipe atual do banco
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setBarbeiros(MOCK_PROFILES.filter(p => p.role === 'barbeiro' || p.role === 'dono'));
      return;
    }

    const fetchEquipe = async () => {
      const { data } = await supabase.from('profiles').select('*').in('role', ['barbeiro', 'dono']);
      if (data) setBarbeiros(data as Profile[]);
    };

    fetchEquipe();
  }, []);

  const handleAddBarbeiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isSupabaseConfigured) {
      const newId = Math.random().toString(36).substring(7);
      
      const { error } = await supabase.from('profiles').insert([{
        id: newId,
        nome,
        role,
        telefone,
        email,       // Funciona apenas se você rodar o script para adicionar essas colunas!
        senha: password // Salvar senha em texto puro apenas para fins didaticos/demonstracao.
      }]);

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Membro da equipe adicionado com sucesso!' });
        setNome(''); setEmail(''); setTelefone(''); setPassword('');
        // Atualiza a lista da tela
        setBarbeiros(prev => [...prev, { id: newId, nome, role, telefone } as Profile]);
      }
    } else {
      // Mock logic
      setTimeout(() => {
        const mockUsers = JSON.parse(localStorage.getItem('captain_mock_users') || '{}');
        if (mockUsers[email]) {
          setMessage({ type: 'error', text: 'E-mail já cadastrado no sistema.' });
        } else {
          const newId = Math.random().toString(36).substring(7);
          const newProfile: Profile = { id: newId, nome, role, telefone };
          MOCK_PROFILES.push(newProfile);
          mockUsers[email] = { password, profileId: newId };
          localStorage.setItem('captain_mock_users', JSON.stringify(mockUsers));
          
          setMessage({ type: 'success', text: `${role === 'dono' ? 'Dono' : 'Barbeiro'} adicionado! (Mock)` });
          setNome(''); setEmail(''); setTelefone(''); setPassword('');
        }
        setLoading(false);
      }, 800);
    }
  };

  const handleDeleteBarbeiro = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este membro da equipe?")) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) {
          setBarbeiros(prev => prev.filter(p => p.id !== id));
        } else {
          alert("Erro ao excluir: " + error.message);
        }
      } else {
        setBarbeiros(prev => prev.filter(p => p.id !== id));
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
      <div className="bg-white/90 dark:bg-graphite-light p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex items-center mb-6">
          <div className="bg-bronze-main/10 p-3 rounded-xl mr-4">
            <UserPlus className="w-6 h-6 text-bronze-main" />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
            Adicionar Barbeiro
          </h2>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAddBarbeiro} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome do Barbeiro" className="w-full bg-zinc-50 dark:bg-graphite-main pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-zinc-900 dark:text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required placeholder="(11) 99999-9999" className="w-full bg-zinc-50 dark:bg-graphite-main pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-zinc-900 dark:text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@exemplo.com" className="w-full bg-zinc-50 dark:bg-graphite-main pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-zinc-900 dark:text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Nível de Acesso</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full bg-zinc-50 dark:bg-graphite-main pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-zinc-900 dark:text-white appearance-none">
                  <option value="barbeiro">Barbeiro (Ver própria agenda)</option>
                  <option value="dono">Dono (Acesso total)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Senha Provisória</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••" className="w-full bg-zinc-50 dark:bg-graphite-main pl-12 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main outline-none text-zinc-900 dark:text-white" />
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-4 mt-2 bg-bronze-main text-graphite-dark font-black uppercase tracking-widest rounded-xl shadow-[0_5px_15px_rgba(197,160,89,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar Membro da Equipe"}
          </button>
        </form>
      </div>

      <div className="bg-white/90 dark:bg-graphite-light p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center">
          <Shield className="w-4 h-4 mr-2" /> Equipe Atual
        </h3>
        <div className="space-y-3">
          {barbeiros.map(b => (
            <div key={b.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-graphite-main rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                  {b.nome[0]}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">{b.nome}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">{b.role}</p>
                </div>
              </div>
              
              {/* Botão de Excluir */}
              {b.role !== 'dono' && (
                <button 
                  onClick={() => handleDeleteBarbeiro(b.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Remover Barbeiro"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
