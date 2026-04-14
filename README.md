# ⚓ Captain Barbearia - PWA Management System

![Banner](https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80)

**Captain Barbearia** é um sistema de gerenciamento mobile-first de alta performance, desenhado especificamente para barbearias modernas que buscam agilidade, elegância e controle total sobre suas operações.

## 🚀 Funcionalidades Principais

- **📅 Agenda Inteligente**: Interface fluida para agendamentos em tempo real, com distinção visual entre serviços.
- **📊 Dashboard Financeiro**: Visão clara de faturamento por serviço e por barbeiro (visão exclusiva para donos).
- **📱 PWA Nativo**: Funciona como um aplicativo no Android, iOS e PC, com suporte a modo offline e ícone na tela inicial.
- **🌓 Design Adaptativo**: Temas Dark e Light otimizados, com estética premium baseada em tons de bronze e grafite.
- **⚡ Realtime**: Sincronização automática de dados via Supabase.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **Estilização**: TailwindCSS (v4), Lucide React
- **Gráficos**: Recharts
- **Backend/Database**: Supabase (Postgres + Realtime)
- **Deployment**: Vercel

## 📦 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone [url-do-repositorio]
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env` com suas credenciais do Supabase (veja `.env.example`).
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🌐 Deploy (Vercel)

Este projeto está configurado para deploy automático na Vercel. Ao conectar seu repositório do GitHub, a Vercel cuidará de todo o processo de build:

1. Importe o repositório na dashboard da Vercel.
2. Configure as variáveis de ambiente (SUPABASE_URL, SUPABASE_ANON_KEY).
3. O build command padrão é `npm run build` e o output directory é `dist`.

---

*Desenvolvido com ❤️ por Captain Barbearia Team.*
