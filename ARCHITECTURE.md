# Tracer — Arquitetura

Este documento descreve como o sistema está montado. Para o porquê de cada escolha (cuid em vez de auto-increment, ipHash em vez de IP bruto, client Prisma fora do versionamento…), ver [DECISIONS.md](./DECISIONS.md).

## Visão Geral

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ HTTP
              ┌────────────┴────────────┐
              │                         │ GET /:slug (redirect direto)
       ┌──────▼──────────┐              │
       │ React SPA :5173 │              │
       │ (frontend/)     │              │
       └──────┬──────────┘              │
              │ fetch/axios (JSON)      │
              ▼                         ▼
                    ┌──────────────────┐
                    │  Express :3000   │
                    │  (app.ts)        │
                    └──────┬───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼───┐  ┌─────▼─────┐ ┌────▼──────┐
        │ routes  │─►│controllers│─►│ services  │
        └─────────┘  └───────────┘ └────┬──────┘
                                         │
                                   ┌─────▼───────┐
                                   │repositories │
                                   └─────┬───────┘
                                         │ Prisma Client
                                   ┌─────▼───────┐
                                   │  PostgreSQL │
                                   │   :5432     │
                                   └─────────────┘
```

Backend monolítico único: um processo Node.js/Express expõe a API, que fala com um único PostgreSQL via Prisma. Não há proxy reverso, cache ou comunicação entre serviços no backend — tudo roda num único processo, adequado ao estágio e à escala atuais do projeto (ver [decisão #9](./DECISIONS.md#9-um-único-serviço-um-único-banco)). O frontend é um segundo processo/projeto independente (SPA em React servida pelo Vite em dev) que fala com a API só por HTTP — não há import de código entre os dois lados (ver [decisão #27](./DECISIONS.md#27-frontend-em-projeto-separado-frontend-design-desenhado-antes-de-codar)). O link curto em si (`GET /:slug`) é acessado direto no backend pelo navegador do visitante — não passa pelo React.

## Alocação de Portas

| Serviço               | Protocolo | Porta | Exposição |
| ---------------------- | --------- | ----- | --------- |
| Express (Tracer API)   | HTTP      | 3000  | Local/dev |
| Vite (Tracer frontend) | HTTP      | 5173  | Local/dev |
| PostgreSQL             | TCP       | 5432  | Local/dev |

## Camadas

`src/app.ts` monta o Express (middlewares, rotas) e é exportado sem subir servidor — facilita testar a app isolada de conexão real com banco. `src/server.ts` conecta o Prisma e só então chama `app.listen()`.

A arquitetura de código segue quatro camadas, cada uma com uma responsabilidade única:

- **routes** — mapeiam método + path para um controller. Não têm lógica.
- **controllers** — leem `req`, validam entrada, chamam o service correspondente e formatam a resposta HTTP (status code, JSON). Não acessam o Prisma diretamente.
- **services** — contêm a lógica de negócio (gerar slug único, validar expiração de link, montar o payload de analytics). Não conhecem `req`/`res`.
- **repositories** — únicas camadas que importam o Prisma Client; encapsulam as queries.

As pastas `src/routes/`, `src/controllers/`, `src/services/` e `src/repositories/` existem a partir da feature de auth; as próximas features (links, analytics) seguem o mesmo padrão. Erros de negócio são lançados como subclasses de `AppError` (`src/errors/`) e capturados por um middleware central (`src/middlewares/error-handler.ts`) — nenhum controller usa `try/catch` manual (Express 5 encaminha rejeições de handlers `async` automaticamente para esse middleware). Entrada de rota é validada com Zod via o middleware genérico `src/middlewares/validate.ts`.

## Modelo de Dados

```
User 1───N Link 1───N Click
User 1───N RefreshToken
```

| Model        | Campos principais                                                                              | Notas                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| User         | `id`, `email` (único), `senhaHash`, `nome`, `createdAt`                                           | Dono dos links                                             |
| Link         | `id`, `slug` (único), `urlOriginal`, `userId`, `ativo`, `expiraEm`, `createdAt`                    | `ativo` desliga o link sem apagar (soft toggle)             |
| Click        | `id`, `linkId`, `timestamp`, `ipHash`, `pais`, `referrer`, `userAgent`, `dispositivo`               | Snapshot do contexto do clique — sem tabelas normalizadas    |
| RefreshToken | `id`, `tokenHash` (único), `userId`, `expiresAt`, `revokedAt`, `createdAt`                          | Só o hash sha256 do token fica no banco, nunca o valor bruto |

IDs de todos os models usam `cuid()` (ver [decisão #6](./DECISIONS.md#6-ids-com-cuid-em-vez-de-auto-increment-ou-uuid)).

## Rotas de Link

Todas exigem `Authorization: Bearer <accessToken>` (middleware `authGuard`) e operam só sobre os links do próprio usuário — pedir para desativar um link de outro usuário responde 404 (não 403, para não revelar que o ID existe).

```
POST   /api/links               { urlOriginal, expiraEm? }
  → 201 { id, slug, urlOriginal, ativo, expiraEm, createdAt }
  → 400 se urlOriginal não for uma URL válida

GET    /api/links
  → 200 [ { id, slug, urlOriginal, ativo, expiraEm, createdAt, totalCliques }, ... ]
  → ordenado por createdAt desc; totalCliques vem de _count.clicks (Prisma), sem query extra

PATCH  /api/links/:id/desativar
  → 200 { ...link com ativo: false }
  → 404 se o link não existe ou não pertence ao usuário

GET    /api/links/:id/analytics
  → 200 { linkId, slug, totalCliques, porDia, porDispositivo, porReferrer, porPais }
  → 404 se o link não existe ou não pertence ao usuário
```

Não há endpoint de exclusão física — só desativação (`ativo: false`), ver [decisão #8](./DECISIONS.md#8-ativo-soft-toggle--expiraem-não-deleção-de-link). O slug é gerado no service (`generateUniqueSlug`, `src/utils/slug.ts`) checando unicidade contra o banco antes de criar.

### Analytics (`GET /api/links/:id/analytics`)

`analyticsService.getLinkAnalytics` busca todos os cliques do link (só os campos necessários) e agrega em memória (ver [decisão #20](./DECISIONS.md#20-agregação-de-analytics-em-memória-não-com-sql-bruto)):

- `porDia` — contagem por dia (`YYYY-MM-DD`), ordenado cronologicamente
- `porDispositivo` / `porReferrer` / `porPais` — contagem por valor, ordenado do maior para o menor; valores ausentes caem no bucket `"desconhecido"`

`porPais` sempre retorna `"desconhecido"` hoje, já que o clique ainda não captura geolocalização (ver [redirecionamento público](#redirecionamento-público)).

## Redirecionamento Público

```
Visitante público
  │  GET /:slug
  ▼
Express → redirectController → linkService.findRedirectTarget(slug)
  │
  ├─► 404 se não existe / inativo / expirado
  └─► 302 redirect para urlOriginal (resposta enviada imediatamente)
         + clickService.register(...) roda depois, sem bloquear a resposta
           → grava Click { linkId, ipHash, referrer, userAgent, dispositivo }
```

Rota montada em `app.ts` como `GET /:slug`, depois de `/health`, `/api/auth` e `/api/links` (senão o padrão de um segmento capturaria essas rotas antes delas serem avaliadas). O registro do clique é best-effort: roda depois de `res.redirect()` já ter sido chamado, e qualquer falha só vai para o log (`console.error`), nunca derruba o redirect. `pais` é preenchido via GeoIP offline (`detectCountry`, ver [decisão #29](./DECISIONS.md#29-geoip-offline-geoip-country-em-vez-de-api-externa-ou-maxmind-oficial)) — fica vazio se o IP for local/privado (dev local, por exemplo) ou não resolver.

## Autenticação

Access token (JWT) de vida curta + refresh token opaco revogável em cookie `httpOnly` (ver [decisão #28](./DECISIONS.md#28-refresh-token-opaco-em-cookie-httponly-substitui-o-jwt-de-7-dias), que substitui a #13).

```
POST /api/auth/register  { nome, email, senha }
  → 201 { user: { id, nome, email }, accessToken } + Set-Cookie: refreshToken (httpOnly)
  → 409 se o e-mail já existe

POST /api/auth/login  { email, senha }
  → 200 { user: { id, nome, email }, accessToken } + Set-Cookie: refreshToken (httpOnly)
  → 401 em credenciais inválidas

POST /api/auth/refresh  (sem body — lê o cookie refreshToken)
  → 200 { accessToken } + Set-Cookie: refreshToken novo (rotacionado)
  → 401 se o cookie estiver ausente/inválido/expirado/já usado
     (reuso de um token já rotacionado revoga todas as sessões do usuário)

POST /api/auth/logout  (sem body — lê o cookie refreshToken)
  → 204, revoga o refresh token e limpa o cookie

Rotas protegidas (a partir da feature de links):
  Authorization: Bearer <accessToken>
  → validado pelo middleware authGuard (src/middlewares/auth-guard.ts)
```

`accessToken` tem TTL de 15 minutos; o `refreshToken` (armazenado só como hash sha256 no banco, model `RefreshToken`) tem TTL de 30 dias. `GET /:slug` (o redirecionamento em si) segue público — não exige autenticação.

## Frontend

`frontend/` é um projeto Vite + React + TypeScript independente (`package.json` próprio, ver [decisão #27](./DECISIONS.md#27-frontend-em-projeto-separado-frontend-design-desenhado-antes-de-codar)). Estrutura:

```
frontend/src/
├── components/    # Sidebar, Header, Button, Input, StatTile, ClicksChart,
│                  # BreakdownCard, DashboardLayout, ProtectedRoute, icons.tsx
├── pages/         # LoginPage, RegisterPage, LinksPage, LinkAnalyticsPage
├── lib/           # api.ts (instância Axios com baseURL + interceptor de Authorization),
│                  # auth.ts (token/usuário no localStorage)
└── types/api.ts   # tipos espelhando as respostas reais do backend
```

Rotas (`react-router-dom`):

```
/login, /register            → públicas
/                             → ProtectedRoute → DashboardLayout → LinksPage
/links/:id                    → ProtectedRoute → DashboardLayout → LinkAnalyticsPage
```

`ProtectedRoute` checa a presença de um token no `localStorage` (sem validar o JWT no client — se o token expirou, a primeira chamada à API volta 401 e a UI trata como erro, não como logout automático ainda). Estado de servidor (lista de links, analytics) vive inteiramente em `@tanstack/react-query` — sem Redux/Zustand/Context próprio para isso; mutações (`criar link`, `desativar`) invalidam a query `["links"]` para refletir na tabela sem refetch manual.

`ClicksChart` (gráfico de cliques por dia) é SVG desenhado à mão com React hooks — não usa `recharts` (instalado, mas reservado para gráficos futuros mais complexos) nem `d3`; a lógica de escala/hover/crosshair é a mesma do componente estático prototipado no Claude Design, só que dirigida por dados reais e de tamanho variável.

Tokens de cor/tipografia ficam em `@theme` dentro de `src/index.css` (Tailwind v4) — mesmos valores usados no projeto do Claude Design (paleta, ver decisão #27), então trocar o design system em um lugar não dessincroniza do outro por muito tempo.

## Estado da Implementação

- [x] Schema Prisma (`User`/`Link`/`Click`) definido e client gerado
- [x] PostgreSQL local configurado, primeira migration (`init`) aplicada
- [x] `GET /health` implementado
- [x] Camadas `routes/controllers/services/repositories`
- [x] Auth (registro/login de `User`, JWT, validação Zod, erro centralizado)
- [x] CRUD de `Link` (criar, listar, desativar) — protegido por `authGuard`
- [x] Redirecionamento público (`GET /:slug`) com registro de `Click` (best-effort, sem `pais` ainda)
- [x] Endpoints de analytics (`GET /api/links/:id/analytics`, agregação por dia/dispositivo/referrer/país)
- [x] Testes automatizados (unitários + integração, 84 testes cobrindo auth/users/links/redirect/analytics)
- [x] CI (GitHub Actions — type-check, testes e build a cada push/PR para `main`)
- [x] Frontend: auth (login/registro), CRUD de link (criar/listar/desativar), analytics por link com gráfico interativo
- [x] Frontend: página de configurações (perfil e troca de senha)
- [x] Refresh token (access token de 15min + refresh token opaco em cookie httpOnly, rotação e detecção de reuso)
- [x] GeoIP no campo `pais` dos cliques (base offline, sem chamada de rede)
- [ ] Deploy do frontend (só roda local por enquanto)

## Testes

Dois níveis (ver [decisão #21](./DECISIONS.md#21-dois-níveis-de-teste-unitário-com-mocks--integração-com-banco-real)):

- **Unitário** — `src/**/*.test.ts`, colocado ao lado do código testado. Mocka o(s) repositório(s) (`vi.mock`) e testa só a lógica do service (conflito de e-mail, expiração de link, agregação de analytics, geração/colisão de slug). Não toca banco.
- **Integração** — `tests/integration/*.test.ts`. `supertest` bate na `app` do Express real, contra um Postgres real de teste (`tracer_test`) — sem nenhum mock de banco, para pegar bugs de integração de verdade (foi assim que o bug do driver adapter do Prisma 7 teria sido pego, se já existisse na época).

```
npm test
  → globalSetup (tests/global-setup.ts) roda `prisma migrate deploy` no banco tracer_test
  → testes unitários rodam com o(s) repositório(s) mockado(s)
  → testes de integração rodam em sequência (fileParallelism: false — ver decisão #22),
    cada um limpando Click/Link/User no beforeEach (tests/integration/helpers.ts)
```

Setup necessário uma única vez por máquina: criar o banco `tracer_test` (a role `tracer` já tem `CREATEDB`) e um `.env.test` (copiado de `.env.test.example`) — ver [README.md](./README.md#rodando-os-testes).

## CI

`.github/workflows/ci.yml` (ver [decisão #24](./DECISIONS.md#24-ci-com-um-único-workflow-postgres-real-como-serviço-do-job)) roda a cada push/PR para `main`:

```
npm ci (postinstall → prisma generate) → npm run typecheck → npm test → npm run build
```

O job sobe um `postgres:16` como `services:`, com `DATABASE_URL`/`JWT_SECRET` injetados direto no `env:` do job — sem depender de nenhum arquivo `.env` (que são gitignored e não existem no runner).

## Deploy

Produção roda no [Render](https://render.com), descrita como código em [`render.yaml`](./render.yaml) (ver [decisão #25](./DECISIONS.md#25-deploy-no-render-via-blueprint-renderyaml)):

```
Browser
  │ HTTPS
  ▼
Web Service (Render, plano free)
  │  build: npm ci && npm run build
  │  start: npx prisma migrate deploy && node dist/server.js
  ▼
Postgres (Render, plano free) — DATABASE_URL injetado automaticamente via Blueprint
```

`migrate deploy` roda a cada start — o schema de produção nunca fica dessincronizado do código que está subindo. Passos manuais de setup (conectar GitHub, criar o Blueprint) em [README.md](./README.md#deploy).
