# Tracer

Painel de links inteligente com analytics. API única em Node.js + Express + TypeScript + Prisma + PostgreSQL. Para o desenho geral do sistema, ver [ARCHITECTURE.md](./ARCHITECTURE.md); para o porquê de cada escolha, ver [DECISIONS.md](./DECISIONS.md).

## Estrutura

```
tracer/
├── src/
│   ├── app.ts               # Config do Express (middlewares, rotas) — sem listen()
│   ├── server.ts            # Conecta o Prisma e sobe o servidor
│   ├── routes/               # Mapeamento rota → controller (ex: auth.routes.ts)
│   ├── controllers/          # HTTP in/out — chamam o service, formatam a resposta
│   ├── services/              # Regra de negócio (ex: auth.service.ts)
│   ├── repositories/          # Únicas classes/objetos que importam o Prisma
│   ├── schemas/                # Schemas Zod por feature (validação de entrada)
│   ├── middlewares/            # validate, error-handler, auth-guard
│   ├── errors/                  # AppError e subclasses (ConflictError, UnauthorizedError...)
│   ├── types/                    # Ambient declarations (ex: express.d.ts)
│   ├── utils/
│   │   ├── prisma.ts             # Singleton do PrismaClient
│   │   └── jwt.ts                 # sign/verify do accessToken
│   └── generated/
│       └── prisma/                 # Client Prisma gerado — fora do version control
├── prisma/
│   ├── schema.prisma        # Models User / Link / Click
│   └── migrations/
├── tests/
│   ├── global-setup.ts       # Roda migrations no banco de teste antes da suíte
│   └── integration/           # Testes via supertest, banco Postgres real (tracer_test)
├── vitest.config.ts          # Carrega .env.test, fileParallelism: false
├── prisma.config.ts         # Config do Prisma 7 (schema path, DATABASE_URL)
├── .env                      # DATABASE_URL, PORT, NODE_ENV, JWT_SECRET
└── .env.test                 # Mesma coisa, apontando para o banco tracer_test
```

Cada feature nova (ex.: links) ganha seu próprio arquivo em `routes/`, `controllers/`, `services/`, `repositories/` e `schemas/`, seguindo o padrão criado pela feature de auth — ver a divisão de responsabilidades em [ARCHITECTURE.md](./ARCHITECTURE.md#camadas).

## ⚠️ Ambiente WSL

Node.js é instalado via **nvm dentro do WSL** — nunca usar o Node do Windows para rodar este projeto. O Node do Windows causa erro de UNC path com npm ao acessar o filesystem via caminho Linux (`\\wsl$\...`). Ver [decisão #1](./DECISIONS.md#1-nodejs-via-nvm-no-wsl).

PostgreSQL também roda localmente no WSL (não em Docker), instalado via `apt`. Comandos administrativos (`sudo -u postgres psql ...`) pedem senha interativa do sudo — rode-os você mesmo no terminal e cole o resultado quando pedirem apoio nessa parte.

## Comandos principais

```bash
npm run dev          # Sobe o servidor com hot-reload (tsx watch)
npm run build        # Compila TypeScript para dist/
npm start             # Roda o build compilado (dist/server.js)
npm test              # Roda toda a suíte (unitários + integração) uma vez
npm run test:watch    # Modo watch
npm run typecheck     # tsc --noEmit cobrindo src/ E tests/ (o build normal não checa tests/)
```

### Prisma

```bash
npm run db:migrate   # prisma migrate dev — cria/aplica migration a partir do schema
npm run db:generate  # prisma generate — regenera o client em src/generated/prisma
npm run db:studio    # Abre o Prisma Studio (GUI do banco)
```

Depois de qualquer alteração em `prisma/schema.prisma`, rode `npm run db:migrate` (gera a migration E regenera o client) antes de usar os novos campos/models no código.

## Prisma — convenções

- **Client fora do versionamento** — gerado em `src/generated/prisma/`, ignorado no `.gitignore`. Regenere com `npm run db:generate` após clonar o repo ou trocar de branch.
- **Singleton em `src/utils/prisma.ts`** — sempre importe `{ prisma }` daqui, nunca instancie `new PrismaClient()` diretamente. Evita esgotar conexões durante o hot-reload do `tsx watch`. Ver [decisão #4](./DECISIONS.md#4-singleton-do-prismaclient).
- **`prisma.config.ts` separado do schema** (Prisma v7) — a `DATABASE_URL` não é lida automaticamente pelo schema; o config importa `dotenv/config` e repassa `process.env.DATABASE_URL`.
- **IDs com `cuid()`** em todos os models — nunca auto-increment nem UUID. Ver [decisão #6](./DECISIONS.md#6-ids-com-cuid-em-vez-de-auto-increment-ou-uuid).
- **Driver adapter explícito** — `PrismaClient` recebe `adapter: new PrismaPg({ connectionString: ... })` (pacote `@prisma/adapter-pg`); o Prisma 7 não abre conexão só com o datasource do schema. Ver [decisão #11](./DECISIONS.md#11-driver-adapter-explícito-do-prisma-7-prismaadapter-pg).
- **Repositórios sempre anotam o retorno como `Promise<Model>` explícito** (usando os tipos gerados em `src/generated/prisma/client`), nunca deixar o TypeScript inferir o tipo "fluente" que `findUnique`/`findFirst`/`create`/`update` retornam por padrão — esse tipo tem métodos extras de atalho de relação que quebram ao mockar o repositório em teste. Ver [decisão #23](./DECISIONS.md#23-repositórios-tipam-o-retorno-explicitamente-como-promisemodel).

## Testes

Dois níveis, ver [decisão #21](./DECISIONS.md#21-dois-níveis-de-teste-unitário-com-mocks--integração-com-banco-real):

- **Unitário** (`src/**/*.test.ts`, colocado ao lado do arquivo testado) — services com o(s) repositório(s) mockado(s) via `vi.mock(...)`, sem tocar banco. Cobre regra de negócio (conflito de e-mail, expiração de link, agregação de analytics, etc.).
- **Integração** (`tests/integration/*.test.ts`) — `supertest` batendo na `app` do Express de ponta a ponta, contra um Postgres **real** de teste (banco `tracer_test`, criado uma única vez com `PGPASSWORD=... createdb -h localhost -U tracer tracer_test`; a role `tracer` já tem `CREATEDB`). As migrations do banco de teste são aplicadas automaticamente pelo `globalSetup` do Vitest antes da suíte rodar — não precisa migrar manualmente.
- Cada teste de integração começa com `resetDatabase()` (`tests/integration/helpers.ts`), que limpa `Click`/`Link`/`User` nessa ordem (respeitando FKs).
- **Arquivos de teste de integração rodam em sequência, nunca em paralelo** (`fileParallelism: false` no `vitest.config.ts`) — todos compartilham o mesmo banco físico sem isolamento por transação; rodar em paralelo causa corrida entre o cleanup de um arquivo e os dados que outro ainda está usando.
- O clique do redirect é assíncrono (ver decisão #17) — testes que verificam `Click` esperam um `setTimeout` curto antes de consultar o banco.

## CI

`.github/workflows/ci.yml` roda em todo push/PR para `main` (ver [decisão #24](./DECISIONS.md#24-ci-com-um-único-workflow-postgres-real-como-serviço-do-job)):

```
npm ci (roda "prisma generate" via postinstall) → npm run typecheck → npm test → npm run build
```

- Sobe um `postgres:16` como `services:` do job — os testes de integração rodam contra um Postgres real também no CI, igual local.
- `DATABASE_URL`/`JWT_SECRET`/`NODE_ENV`/`PORT` são injetados direto no `env:` do job — **não** existe `.env`/`.env.test` no runner (são gitignored). O `dotenv.config()` chamado pelo `vitest.config.ts`/`prisma.config.ts` nunca sobrescreve uma env var já setada, então isso funciona sem nenhum arquivo.
- `node-version-file: .nvmrc` — a versão do Node do CI vem do mesmo `.nvmrc` usado localmente (`22`), uma única fonte de verdade.
- Sem passo de lint ainda — o projeto não tem ESLint configurado.

## Auth / erros / validação — convenções

- **Erros de negócio são exceções** — services lançam `ConflictError`, `UnauthorizedError` (ou uma nova subclasse de `AppError` em `src/errors/`) em vez de retornar `{ ok, error }`. Um único middleware (`src/middlewares/error-handler.ts`, montado por último em `app.ts`) traduz para a resposta HTTP. Ver [decisão #14](./DECISIONS.md#14-erros-como-exceções--middleware-central-não-resultt-e).
- **Controllers são `async` diretos, sem try/catch nem wrapper** — Express 5 encaminha automaticamente qualquer rejeição de uma função `async` passada como handler para o `errorHandler`. Não adicionar um `asyncHandler`/wrapper — é redundante nesta versão do Express.
- **Validação de entrada com Zod** — schema por feature em `src/schemas/`, aplicado na rota via `validate(schema)` (`src/middlewares/validate.ts`), antes do controller. Nunca validar manualmente dentro do controller.
- **JWT** — `signAccessToken`/`verifyAccessToken` em `src/utils/jwt.ts`; segredo em `JWT_SECRET` (`.env`). Rotas protegidas usam o middleware `authGuard` (`src/middlewares/auth-guard.ts`), que popula `req.userId`.

## Convenções de código

- TypeScript em modo `strict`, `module: commonjs`, target `ES2022`.
- `app.ts` nunca chama `.listen()` — só `server.ts` faz isso, para permitir importar a app em testes sem subir um servidor real.
- Dados de contexto do clique (`pais`, `dispositivo`, `referrer`, `userAgent`) ficam como campos simples em `Click`, não em tabelas normalizadas à parte — são metadados de leitura, não entidades com identidade própria.
- IP nunca é armazenado em texto puro — sempre como `ipHash`. Ver [decisão #7](./DECISIONS.md#7-iphash-em-vez-de-ip-bruto).

## Git Conventions

Conventional commits com prefixo de emoji: `<emoji> <type>: <description>`

- `✨ feat:` — nova funcionalidade
- `🐛 fix:` — correção de bug
- `♻️ refactor:` — refatoração
- `✅ test:` — testes
- `📦 chore:` — manutenção
- `📝 docs:` — documentação
