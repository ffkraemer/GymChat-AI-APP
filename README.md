# GymChat AI — Portal de Administração

Frontend React + TypeScript (Vite) para o Portal de Administração.

> **Nota sobre versionamento**: este é um repositório separado do backend
> (`GymChat-AI`). A tag `v4-admin-portal` marca o commit inicial aqui porque
> corresponde ao 4º incremento da solução como um todo (POC → SQL Server →
> motor de fidelização → autenticação → **portal de administração**) — não é
> a "4ª versão deste repo" isoladamente. O histórico das versões anteriores
> (`v0` a `v3`) vive no repositório do backend.

## O que já está implementado

- **Login** com Bearer tokens (refresh automático)
- **FAQs**: listar e criar, com pré-visualização em tempo real de como a resposta
  aparece no WhatsApp
- **Gyms** (só visível para contas com o papel `PlatformAdmin`): criar gyms novos e
  registar o primeiro administrador de cada um — base do multi-tenant

## Pré-requisitos

- Node.js 20+
- O backend (`GymChatAI.Api`) a correr **em modo SQL Server** (`docker compose up -d` no
  repositório do backend + connection string configurada) — a autenticação não funciona em
  modo in-memory

## Configuração

```bash
cp .env.example .env
```
Por omissão aponta para `http://localhost:5277` (o backend em desenvolvimento). Ajusta
`VITE_API_BASE_URL` se o backend estiver noutro endereço.

## Correr

```bash
npm install
npm run dev
```
Abre `http://localhost:5173`.

### Contas de demonstração

| Papel | Email | Password | O que vês |
|---|---|---|---|
| Admin (de um gym) | `admin@demo.gymchat.ai` | `GymChat!Demo123` | Só FAQs, do gym de demonstração |
| PlatformAdmin | `platform@demo.gymchat.ai` | `GymChat!Platform123` | FAQs (vazio, sem gym próprio) + página Gyms |

Ambas criadas automaticamente pelo seeder do backend, no primeiro arranque.

## Build de produção

```bash
npm run build   # gera dist/
npm run preview # serve o build localmente para testar
npm run lint    # oxlint
```

## Estrutura

```
src/
  api/          — cliente fetch (com refresh automático de token) + chamadas por recurso
  auth/         — AuthContext, useAuth, ProtectedRoute
  components/   — AppShell (sidebar, com navegação condicional por papel) e ChatBubble
  pages/        — LoginPage, FaqsPage, GymsPage
```

## Decisões de design

- **Paleta**: grafite quente (`#1c1b19`) em vez do bege/terracota ou preto/verde-néon
  genéricos, com um acento âmbar (`#e8a33d`) — inspirado em fita/marcação de ginásio.
- **Tipografia**: Space Grotesk (títulos), Inter (corpo), JetBrains Mono (dados/categorias).
- **Elemento-assinatura**: cada FAQ é mostrada como uma pré-visualização real de balão de
  WhatsApp — porque é literalmente a mensagem que o assistente vai enviar. Não é decoração,
  é a forma mais direta de confirmar "é isto que o cliente vai receber" antes de guardar.
- **Tokens**: guardados em `localStorage` (par access+refresh token). Isto é uma app real que
  corre no browser do utilizador — diferente de um artifact do Claude.ai, onde isso seria
  desaconselhado.
- **Controlo de acesso por papel**: a página Gyms não é só "escondida" na navegação — o
  próprio componente verifica o papel do utilizador autenticado (`user.roles`) e mostra
  "Acesso restrito" se não for `PlatformAdmin`, mesmo que alguém tente aceder ao URL
  diretamente. A validação "a sério" continua a acontecer no backend (`Policies.PlatformAdmin`);
  isto no frontend é só para uma boa experiência, não é a camada de segurança.

## Próximos passos

- Páginas de Campanhas, Membros, Planos e Promoções (mesma arquitetura, endpoints já existem
  no backend e já estão protegidos)
- Estado vazio mais rico / paginação se o número de FAQs/Gyms crescer muito
- Testes (Vitest + Testing Library)
