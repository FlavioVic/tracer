# Tracer

Painel de links inteligente com analytics. Você cadastra um link, recebe um slug curto, compartilha em qualquer canal (bio, currículo, panfleto) e acompanha de onde vieram os cliques — quando, de que dispositivo, país e referrer.

🔗 **API ao vivo:** https://tracer-api-2ywo.onrender.com/health (plano free do Render — o primeiro acesso após um tempo ocioso pode demorar alguns segundos para acordar)

Para o desenho geral do sistema, ver [ARCHITECTURE.md](./ARCHITECTURE.md). Para o porquê de cada decisão técnica, ver [DECISIONS.md](./DECISIONS.md). Para convenções de código e comandos do dia a dia, ver [CLAUDE.md](./CLAUDE.md).

## Stack

**Backend:** Node.js 22 + Express 5 + TypeScript 6 + Prisma 7 + PostgreSQL
**Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query

## Status

O núcleo funcional do produto está pronto e testado: um usuário se cadastra, cria links, qualquer visitante é redirecionado pelo slug (com o clique registrado em segundo plano) e o usuário acompanha analytics agregados por link — tanto pela API quanto pelo dashboard.

- [x] Schema Prisma + migration inicial
- [x] Auth (registro/login, JWT)
- [x] CRUD de links (criar, listar, desativar)
- [x] Redirecionamento público por slug + registro de clique
- [x] Analytics de cliques (por dia, dispositivo, referrer, país)
- [x] Testes automatizados (48 testes — unitários + integração)
- [x] CI (GitHub Actions — type-check, testes e build a cada push/PR)
- [x] Deploy do backend (Render — [ao vivo](https://tracer-api-2ywo.onrender.com/health))
- [x] Frontend (dashboard: auth, links, analytics com gráfico) — roda local, deploy pendente
- [ ] Deploy do frontend

## Como rodar localmente

### Pré-requisitos

- Node.js 22 (recomendado via [nvm](https://github.com/nvm-sh/nvm))
- PostgreSQL rodando localmente

> Rodando em WSL? Use o Node instalado dentro do WSL via nvm — o Node do Windows causa erro de UNC path com npm. Ver [decisão #1](./DECISIONS.md#1-nodejs-via-nvm-no-wsl).

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o banco

Crie um usuário e um banco no Postgres:

```bash
sudo -u postgres psql -c "CREATE USER tracer WITH PASSWORD 'sua_senha';"
sudo -u postgres psql -c "CREATE DATABASE tracer OWNER tracer;"
sudo -u postgres psql -c "ALTER USER tracer CREATEDB;"
```

(`CREATEDB` é necessário para o Prisma criar o shadow database usado por `migrate dev`.)

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste a `DATABASE_URL` com o usuário/senha criados:

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://tracer:sua_senha@localhost:5432/tracer?schema=public"
PORT=3000
NODE_ENV=development
```

### 4. Rodar as migrations

```bash
npm run db:migrate
```

### 5. Subir o servidor

```bash
npm run dev
```

A API sobe em `http://localhost:3000`. Verifique com:

```bash
curl http://localhost:3000/health
```

## Como rodar o frontend localmente

O frontend é um projeto Vite/React separado, em `frontend/`. Com o backend já rodando (passos acima) num terminal:

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:3000 (padrão já serve para dev local)
npm run dev
```

O dashboard sobe em `http://localhost:5173`. Crie uma conta pela própria tela de cadastro — não há seed de usuário.

## Rodando os testes

A suíte usa um banco Postgres de teste separado (`tracer_test`), para nunca tocar nos dados do banco de desenvolvimento.

### 1. Criar o banco de teste (uma vez só)

A role `tracer` já tem `CREATEDB` (necessário para o Prisma), então dá pra criar sem `sudo`:

```bash
PGPASSWORD=sua_senha createdb -h localhost -U tracer tracer_test
```

### 2. Configurar o `.env.test`

```bash
cp .env.test.example .env.test
```

Ajuste a `DATABASE_URL` com o usuário/senha do passo acima, apontando para `tracer_test`.

### 3. Rodar

```bash
npm test          # roda toda a suíte uma vez (aplica as migrations pendentes automaticamente)
npm run test:watch # modo watch
npm run typecheck  # type-check cobrindo src/ e tests/
```

## Deploy

A infraestrutura de produção é descrita como código em [`render.yaml`](./render.yaml) (ver [decisão #25](./DECISIONS.md#25-deploy-no-render-via-blueprint-renderyaml)): um Web Service + um Postgres, ambos no [Render](https://render.com). Passos manuais (só dá pra fazer pelo painel do Render, com a sua conta):

1. Crie uma conta no Render e conecte sua conta do GitHub.
2. No painel, **New → Blueprint**, selecione o repositório `tracer`. O Render lê o `render.yaml` sozinho e propõe criar o Web Service (`tracer-api`) e o Postgres (`tracer-db`).
3. Confirme a criação. `DATABASE_URL` e `JWT_SECRET` são gerados automaticamente. `FRONTEND_URL` (usado pelo CORS restrito, ver [decisão #28](./DECISIONS.md#28-refresh-token-opaco-em-cookie-httponly-substitui-o-jwt-de-7-dias)) precisa ser preenchido manualmente no painel do Render com a URL de produção do frontend, quando ele for deployado.
4. Aguarde o primeiro build. Ele roda `npm ci && npm run build`, depois `npx prisma migrate deploy` antes de subir o servidor — o schema de produção fica sincronizado automaticamente a cada deploy.
5. Teste com `curl https://<seu-serviço>.onrender.com/health`.

O plano free do Render hiberna o serviço depois de um tempo sem tráfego — o primeiro acesso após ficar ocioso demora alguns segundos a mais para responder (cold start). O Postgres free também costuma ter um prazo de validade — vale conferir no painel do Render ao criar.

## Scripts disponíveis

| Script                | Descrição                                              |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`          | Sobe o servidor com hot-reload (`tsx watch`)              |
| `npm run build`        | Compila TypeScript para `dist/`                           |
| `npm start`            | Roda o build compilado (`dist/server.js`)                 |
| `npm run db:migrate`   | Cria/aplica migrations a partir do schema Prisma          |
| `npm run db:generate`  | Regenera o Prisma Client                                    |
| `npm run db:studio`    | Abre o Prisma Studio (GUI do banco)                        |
| `npm test`             | Roda toda a suíte de testes (unitários + integração)       |
| `npm run test:watch`   | Roda os testes em modo watch                                |
| `npm run typecheck`    | Type-check cobrindo `src/` e `tests/`                        |

## Estrutura do projeto

```
tracer/
├── src/                 # Backend (Express + Prisma)
│   ├── app.ts          # Config do Express
│   ├── server.ts       # Conecta o Prisma e sobe o servidor
│   ├── utils/prisma.ts # Singleton do PrismaClient
│   └── generated/      # Client Prisma (gerado, fora do git)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   └── integration/    # Testes de ponta a ponta via supertest
├── prisma.config.ts
└── frontend/            # Dashboard (React + Vite), projeto npm independente
    └── src/
        ├── components/
        ├── pages/
        ├── lib/         # cliente Axios + helpers de sessão
        └── types/
```

Detalhes de cada camada em [ARCHITECTURE.md](./ARCHITECTURE.md#camadas), do frontend em [ARCHITECTURE.md](./ARCHITECTURE.md#frontend), estratégia de testes em [ARCHITECTURE.md](./ARCHITECTURE.md#testes).
