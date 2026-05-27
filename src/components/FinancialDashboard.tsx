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
    const barberServicesCountMap: Record<string, number> = {};
    const serviceCountMap: Record<string, number> = { 'Corte': 0, 'Barba': 0, 'Combo': 0 };

    const relevantAgendamentos = currentUser.role === 'dono' 
      ? agendamentos 
      : agendamentos.filter(a => a.barbeiro_id === currentUser.id);

    relevantAgendamentos.forEach(ag => {
      const price = TABELA_PRECOS[ag.servico as keyof typeof TABELA_PRECOS] || 0;
      totalRevenue += price;
      
      // For general barber comparison
      if (!barberRevenueMap[ag.barbeiro_id]) {
        barberRevenueMap[ag.barbeiro_id] = 0;
        barberServicesCountMap[ag.barbeiro_id] = 0;
      }
      barberRevenueMap[ag.barbeiro_id] += price;
      barberServicesCountMap[ag.barbeiro_id] += 1;
      
      // For service breakdown
      if (serviceCountMap[ag.servico] !== undefined) {
        serviceCountMap[ag.servico] += 1;
      }
    });

    return { totalRevenue, barberRevenueMap, barberServicesCountMap, serviceCountMap };
  }, [agendamentos, currentUser]);

  // Format data for Recharts BarChart (Dono)
  const barChartData = useMemo(() => {
    if (currentUser.role !== 'dono') return [];
    
    return Object.entries(stats.barberRevenueMap).map(([barbeiroId, amount]) => {
      const barber = MOCK_PROFILES.find(p => p.id === barbeiroId);
      const comissao = amount * 0.40; // 40% comissão
      const lucroLoja = amount * 0.60; // 60% loja
      return {
        id: barbeiroId,
        name: barber ? barber.nome : 'Desconhecido',
        ganhoTotal: amount,
        comissao: comissao,
        lucroLoja: lucroLoja,
        servicesCount: stats.barberServicesCountMap[barbeiroId] || 0
      };
    });
  }, [stats.barberRevenueMap, stats.barberServicesCountMap, currentUser.role]);

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

      <div className="w-full h-72 mt-4">
        {currentUser.role === 'dono' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip 
                cursor={{ fill: 'rgba(197, 160, 89, 0.1)' }}
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                itemStyle={{ color: '#C5A059' }}
                formatter={(value: any, name: string) => {
                  if (name === 'lucroLoja') return [`R$ ${Number(value || 0).toFixed(2)}`, 'Lucro da Loja (60%)'];
                  if (name === 'comissao') return [`R$ ${Number(value || 0).toFixed(2)}`, 'Comissão do Barbeiro (40%)'];
                  return [`R$ ${Number(value || 0).toFixed(2)}`, name];
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="lucroLoja" stackId="a" fill="#3f3f46" name="lucroLoja" maxBarSize={60} />
              <Bar dataKey="comissao" stackId="a" fill="#C5A059" name="comissao" radius={[6, 6, 0, 0]} maxBarSize={60} />
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
      
      {/* Detalhamento por Barbeiro (Dono) */}
      {currentUser.role === 'dono' && barChartData.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-4">Detalhamento por Barbeiro</h3>
          <div className="grid grid-cols-1 gap-4">
            {barChartData.map((data) => (
              <div key={data.id} className="bg-zinc-50 dark:bg-graphite-main p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                      {data.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{data.name}</p>
                      <p className="text-xs text-zinc-500">{data.servicesCount} serviços realizados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Total Gerado</p>
                    <p className="font-bold text-zinc-900 dark:text-white">R$ {data.ganhoTotal.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white dark:bg-graphite-light p-3 rounded-xl border border-bronze-main/30 flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500">Salário (40%)</span>
                    <span className="text-sm font-bold text-bronze-main">R$ {data.comissao.toFixed(2)}</span>
                  </div>
                  <div className="bg-white dark:bg-graphite-light p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500">Loja (60%)</span>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">R$ {data.lucroLoja.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini resumo para barbeiros (opcional mas bonito) */}
      {currentUser.role !== 'dono' && pieChartData.length > 0 && (
         <div className="flex justify-center mt-6 space-x-8 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <div className="text-center">
               <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">Seu Salário (40%)</span>
               <span className="text-bronze-main font-bold text-xl">R$ {(stats.totalRevenue * 0.40).toFixed(2)}</span>
            </div>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="flex space-x-6">
              {pieChartData.map(item => (
                <div key={item.name} className="flex flex-col items-center justify-center">
                   <span className="text-zinc-500 text-xs uppercase tracking-wider">{item.name}</span>
                   <span className="text-zinc-900 dark:text-white font-bold text-lg">{item.value}</span>
                </div>
              ))}
            </div>
         </div>
      )}
    </div>
  );
}
