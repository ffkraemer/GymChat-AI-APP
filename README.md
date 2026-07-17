# GymChat AI — Portal de Administração

Frontend React + TypeScript (Vite) para o Portal de Administração. Primeira versão: **login
+ gestão de FAQs**.

## Pré-requisitos

- Node.js 20+
- O backend (`GymChatAI.Api`) a correr **em modo SQL Server** (`docker compose up -d` na raiz
  do repo + connection string configurada) — a autenticação não funciona em modo in-memory,
  ver o README principal

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
Abre `http://localhost:5173`. Login de demonstração: `admin@demo.gymchat.ai` / `GymChat!Demo123`
(criado automaticamente pelo seeder do backend).

## Build de produção

```bash
npm run build   # gera dist/
npm run preview # serve o build localmente para testar
```

## Estrutura

```
src/
  api/          — cliente fetch (com refresh automático de token) + chamadas por recurso
  auth/         — AuthContext, useAuth, ProtectedRoute
  components/   — AppShell (sidebar) e ChatBubble (pré-visualização de WhatsApp)
  pages/        — LoginPage, FaqsPage
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

## Próximos passos

- Páginas de Campanhas, Membros, Planos e Promoções (mesma arquitetura, endpoints já existem
  no backend e já estão protegidos)
- Estado vazio mais rico / paginação se o número de FAQs crescer muito
- Testes (Vitest + Testing Library)
