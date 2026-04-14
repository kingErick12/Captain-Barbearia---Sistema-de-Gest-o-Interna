import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp } from 'lucide-react';
import type { Agendamento, Profile } from '../lib/supabase';
import { MOCK_PROFILES } from '../lib/supabase';

type FinancialDashboardProps = {
  agendamentos: Agendamento[];
  currentUser: Profile;
};

const TABELA_PRECOS = {
  'Corte': 40,
  'Barba': 30,
  'Combo': 65
};

const PIE_COLORS = ['#C5A059', '#3f3f46', '#B08B4B'];

export function FinancialDashboard({ agendamentos, currentUser }: FinancialDashboardProps) {
  
  // Calculate general daily stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    
    const barberRevenueMap: Record<string, number> = {};
    const serviceCountMap: Record<string, number> = { 'Corte': 0, 'Barba': 0, 'Combo': 0 };

    const relevantAgendamentos = currentUser.role === 'dono' 
      ? agendamentos 
      : agendamentos.filter(a => a.barbeiro_id === currentUser.id);

    relevantAgendamentos.forEach(ag => {
      const price = TABELA_PRECOS[ag.servico] || 0;
      totalRevenue += price;
      
      // For general barber comparison
      if (!barberRevenueMap[ag.barbeiro_id]) {
        barberRevenueMap[ag.barbeiro_id] = 0;
      }
      barberRevenueMap[ag.barbeiro_id] += price;
      
      // For service breakdown
      serviceCountMap[ag.servico] += 1;
    });

    return { totalRevenue, barberRevenueMap, serviceCountMap };
  }, [agendamentos, currentUser]);

  // Format data for Recharts BarChart (Dono)
  const barChartData = useMemo(() => {
    if (currentUser.role !== 'dono') return [];
    
    return Object.entries(stats.barberRevenueMap).map(([barbeiroId, amount]) => {
      const barber = MOCK_PROFILES.find(p => p.id === barbeiroId);
      return {
        name: barber ? barber.nome : 'Desconhecido',
        ganho: amount
      };
    });
  }, [stats.barberRevenueMap, currentUser.role]);

  // Format data for Recharts PieChart (Barbeiro)
  const pieChartData = useMemo(() => {
    return Object.entries(stats.serviceCountMap)
      .filter(([, count]) => count > 0)
      .map(([service, count]) => ({
        name: service,
        value: count
      }));
  }, [stats.serviceCountMap]);

  return (
    <div className="bg-white/90 dark:bg-graphite-light/90 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center text-zinc-900 dark:text-white">
            <TrendingUp className="w-5 h-5 mr-2 text-bronze-main" />
            Visão Financeira Diária
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {currentUser.role === 'dono' ? 'Faturamento total do estúdio de hoje' : 'Seu desempenho financeiro do dia'}
          </p>
        </div>
        
        <div className="bg-bronze-main/10 border border-bronze-main/20 p-3 rounded-2xl text-right">
          <p className="text-xs text-bronze-main uppercase tracking-widest font-semibold">Total Arrecadado</p>
          <div className="flex items-center justify-end text-bronze-main text-2xl font-black mt-1">
            <DollarSign className="w-5 h-5 mr-0.5" />
            {stats.totalRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="w-full h-64 mt-4">
        {currentUser.role === 'dono' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip 
                cursor={{ fill: 'rgba(197, 160, 89, 0.1)' }}
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                itemStyle={{ color: '#C5A059' }}
                formatter={(value: any) => [`R$ ${Number(value || 0).toFixed(2)}`, 'Faturamento']}
              />
              <Bar dataKey="ganho" fill="#C5A059" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieChartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                itemStyle={{ color: '#C5A059' }}
                formatter={(value: any) => [`${value || 0} serviços`, 'Quantidade']}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Mini resumo para barbeiros (opcional mas bonito) */}
      {currentUser.role !== 'dono' && pieChartData.length > 0 && (
         <div className="flex justify-center mt-4 space-x-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            {pieChartData.map(item => (
              <div key={item.name} className="flex flex-col items-center">
                 <span className="text-zinc-500 text-xs uppercase tracking-wider">{item.name}</span>
                 <span className="text-zinc-900 dark:text-white font-bold text-lg">{item.value}</span>
              </div>
            ))}
         </div>
      )}
    </div>
  );
}
