import { useState } from 'react';
import { X, Calendar, User, Scissors } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: Date | null;
  onSave: (clienteNome: string, servico: 'Corte' | 'Barba' | 'Combo') => void;
};

export function BookingModal({ isOpen, onClose, selectedTime, onSave }: BookingModalProps) {
  const [clienteNome, setClienteNome] = useState('');
  const [servico, setServico] = useState<'Corte' | 'Barba' | 'Combo'>('Corte');

  if (!isOpen || !selectedTime) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteNome.trim()) {
      onSave(clienteNome, servico);
      setClienteNome('');
      setServico('Corte');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-graphite-light sm:rounded-2xl rounded-t-3xl border sm:border-zinc-200 sm:dark:border-zinc-700 border-none shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Novo Agendamento</h2>
            <p className="text-bronze-main text-sm flex items-center mt-1">
              <Calendar className="w-4 h-4 mr-1 pb-0.5" />
              {format(selectedTime, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-100 dark:bg-graphite-main rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-medium ml-1">
              Nome do Cliente
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João Silva"
                required
                className="w-full bg-zinc-50 dark:bg-graphite-main text-zinc-900 dark:text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-bronze-main focus:ring-1 focus:ring-bronze-main outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-medium"
              />
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-medium ml-1">
              Serviço
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Corte', 'Barba', 'Combo'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServico(s)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                    servico === s 
                      ? "bg-bronze-main/10 border-bronze-main text-bronze-main" 
                      : "bg-zinc-50 dark:bg-graphite-main border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-bronze-main dark:hover:border-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                  )}
                >
                  <Scissors className={cn(
                    "w-5 h-5 mb-2", 
                    servico === s ? "text-bronze-main" : "text-zinc-500"
                  )} />
                  <span className="text-sm font-semibold tracking-wide uppercase">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 pb-safe sm:pb-0">
            <button
              type="submit"
              className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm bg-bronze-main text-graphite-main hover:bg-bronze-light shadow-[0_0_20px_rgba(197,160,89,0.2)] transition-all duration-300"
            >
              Confirmar Horário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
