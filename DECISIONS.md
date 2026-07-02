# Tracer — Decisões de Arquitetura (ADR)

Registro das principais decisões e por que foram tomadas. A intenção é preservar o raciocínio — o código mostra o como, o [ARCHITECTURE.md](./ARCHITECTURE.md) mostra o quê, e este documento mostra o **porquê** e o que abrimos mão em cada escolha.

Cada decisão segue o formato Contexto → Decisão → Justificativa → Trade-offs.

## 1. Node.js via nvm no WSL

**Contexto.** O projeto roda em ambiente Windows com WSL. O Node instalado nativamente no Windows tentava acessar o filesystem via caminho UNC (`\\wsl$\...`) ao rodar comandos npm dentro do WSL.

**Decisão.** Node.js instalado via `nvm` diretamente dentro do WSL (Linux), nunca o binário do Windows.

**Justificativa.** Elimina o erro de UNC path; o Node roda nativamente sobre o filesystem Linux, sem tradução de caminho entre os dois mundos.

**Trade-offs.** Exige lembrar de sempre abrir um terminal WSL (não PowerShell) para rodar o projeto.

## 2. Arquitetura em camadas (routes → controllers → services → repositories)

**Contexto.** Mesmo um projeto pequeno se beneficia de separar "como a requisição chega" de "qual é a regra de negócio" de "como o dado é persistido" — principalmente por ser um projeto de aprendizado, onde a separação ajuda a entender responsabilidades.

**Decisão.** Quatro camadas explícitas: `routes` (mapeamento de rota), `controllers` (HTTP in/out), `services` (regra de negócio), `repositories` (acesso ao Prisma).

**Justificativa.** Nenhuma camada superior conhece detalhes da inferior além da interface esperada — trocar o Prisma por outro client, por exemplo, só afetaria `repositories`. Facilita também testar `services` sem precisar de um request HTTP real.

**Trade-offs.** Mais arquivos e indireção do que colocar tudo direto no controller, para um projeto que ainda é pequeno.

## 3. Client Prisma gerado fora do version control

**Contexto.** O Prisma gera uma pasta inteira de código TypeScript (`src/generated/prisma`) a partir do `schema.prisma`.

**Decisão.** `src/generated/prisma/` fica no `.gitignore`; é regenerado via `npm run db:generate`.

**Justificativa.** O client é 100% derivado do schema — versioná-lo duplicaria a fonte de verdade e infla o diff a cada mudança de schema sem agregar informação. Qualquer ambiente novo (clone, CI) roda `prisma generate` antes do primeiro uso.

**Trade-offs.** Um passo a mais depois de clonar o repo ou trocar de branch (rodar `db:generate`) antes que o TypeScript compile sem erros de import.

## 4. Singleton do PrismaClient

**Contexto.** `npm run dev` usa `tsx watch`, que recarrega o módulo a cada mudança de arquivo. Sem cuidado, cada reload criaria uma nova instância de `PrismaClient` — e uma nova conexão com o Postgres — sem fechar a anterior.

**Decisão.** Uma única instância de `PrismaClient` guardada em `globalThis` (`src/utils/prisma.ts`), reaproveitada entre reloads em desenvolvimento.

**Justificativa.** Evita esgotar o pool de conexões do Postgres durante uma sessão de desenvolvimento com muitos hot-reloads.

**Trade-offs.** Padrão um pouco menos óbvio para quem não conhece o problema do hot-reload — por isso documentado em comentário no próprio arquivo.

## 5. `prisma.config.ts` separado do schema (Prisma v7)

**Contexto.** A partir do Prisma 7, o `DATABASE_URL` deixou de ser lido automaticamente do `.env` pelo `schema.prisma` — é preciso um arquivo de config explícito.

**Decisão.** `prisma.config.ts` na raiz, importando `dotenv/config` e repassando `process.env.DATABASE_URL` para o datasource.

**Justificativa.** Decisão essencialmente imposta pela versão do Prisma escolhida (7.8.0) — não há alternativa dentro do mesmo major.

**Trade-offs.** Mais um arquivo de configuração para quem já espera o `.env` "simplesmente funcionar" com Prisma, como em versões anteriores.

## 6. IDs com `cuid()` em vez de auto-increment ou UUID

**Contexto.** `slug` de `Link` e IDs em geral são expostos publicamente (o link curto é acessado por qualquer visitante).

**Decisão.** Todos os models (`User`, `Link`, `Click`) usam `id String @id @default(cuid())`.

**Justificativa.** Auto-increment exporia a quantidade de registros e permitiria enumerar IDs sequencialmente (ex.: tentar `/link/1`, `/link/2`...). `cuid()` gera IDs não sequenciais, mais curtos e URL-safe que UUID, mantendo alguma ordenação temporal sem ser previsível.

**Trade-offs.** IDs maiores que um simples inteiro; joins e índices um pouco mais pesados que uma chave numérica — irrelevante na escala atual do projeto.

## 7. `ipHash` em vez de IP bruto

**Contexto.** O analytics de clique precisa diferenciar/contabilizar origens sem se tornar um repositório de dados pessoais sensíveis desnecessário.

**Decisão.** `Click.ipHash` guarda um hash do IP, nunca o IP em texto puro.

**Justificativa.** Permite deduplicar/analisar cliques por origem sem armazenar um dado diretamente identificável — reduz a superfície de dados sensíveis do projeto (mesmo sendo um projeto de estudo, é o hábito correto a praticar).

**Trade-offs.** Não é possível recuperar o IP original a partir do hash (por design) — se um caso de uso futuro precisar do IP real (ex.: geolocalização em tempo real na hora do clique, antes de hashear), isso precisa acontecer antes do hash ser gravado, não depois.

## 8. `ativo` (soft toggle) + `expiraEm`, não deleção de `Link`

**Contexto.** Um link pode precisar ser desativado (sem perder o histórico de cliques associados) ou expirar automaticamente após uma data.

**Decisão.** `Link.ativo: Boolean` controla se o link ainda redireciona; `Link.expiraEm: DateTime?` opcional permite expiração automática. Não há exclusão física de `Link`.

**Justificativa.** Deletar um `Link` quebraria a integridade referencial com `Click` (o histórico de analytics ficaria órfão ou teria que ser deletado em cascata, perdendo dados). Desativar preserva o histórico e ainda permite reativar o link depois.

**Trade-offs.** Links "desativados" continuam ocupando espaço no banco indefinidamente — aceitável na escala atual; um job de limpeza/arquivamento fica para quando (se) isso importar.

## 9. Um único serviço, um único banco

**Contexto.** Diferente de um sistema com múltiplos domínios de negócio distintos, o Tracer tem um único domínio coeso (links + cliques de um usuário) e está em estágio inicial de um projeto de pesquisa/portfólio.

**Decisão.** Uma API única (Express) e um único PostgreSQL — sem separação em serviços, sem gRPC, sem cache dedicado.

**Justificativa.** Separar em múltiplos serviços agora seria complexidade sem benefício correspondente: não há domínios com ciclos de vida ou times diferentes a isolar, nem carga que justifique escalar partes do sistema de forma independente.

**Trade-offs.** Se o projeto crescer (ex.: um serviço de analytics pesado e separado do CRUD de links), esta decisão será revisitada — mas antecipar essa separação agora seria over-engineering.

## 10. PostgreSQL local via `apt`, não Docker

**Contexto.** Ambiente de desenvolvimento único (WSL local), sem necessidade de orquestrar múltiplos serviços de banco.

**Decisão.** PostgreSQL 14 instalado diretamente no WSL via `apt`, rodando como serviço do sistema (`service postgresql`), em vez de um container Docker.

**Justificativa.** Para um único banco em ambiente de desenvolvimento local, evita a camada extra de Docker (imagem, volume, rede) quando o pacote nativo já resolve — menos peças móveis para um estudante configurar e entender.

**Trade-offs.** Setup menos portável entre máquinas/SOs do que um `docker-compose up`; comandos administrativos (criar role/database) exigem `sudo` interativo, que não pode ser automatizado pelo assistente — precisa ser rodado manualmente pelo usuário.

## 11. Driver adapter explícito do Prisma 7 (`@prisma/adapter-pg`)

**Contexto.** Ao rodar o servidor pela primeira vez, o `PrismaClient` do Prisma 7 (gerador `prisma-client`, não o antigo `prisma-client-js`) recusou inicializar sem um driver adapter — diferente de versões anteriores, o datasource do schema sozinho não basta mais para abrir a conexão.

**Decisão.** `src/utils/prisma.ts` instancia `new PrismaPg({ connectionString: process.env.DATABASE_URL })` (pacote `@prisma/adapter-pg`) e passa como `adapter` para o `PrismaClient`.

**Justificativa.** É a forma suportada pelo gerador `prisma-client` do Prisma 7 — os adapters desacoplam o client do driver de banco específico (permitindo, por exemplo, trocar para um driver serverless sem mudar o schema).

**Trade-offs.** Mais uma dependência (`@prisma/adapter-pg` + `pg` por baixo) e um passo a mais de configuração que não existia em versões anteriores do Prisma — documentado aqui justamente por não ser óbvio vindo de projetos com Prisma 5/6.

## 12. `bcrypt` para hash de senha

**Contexto.** Senha de usuário nunca pode ser armazenada em texto puro (`User.senhaHash`).

**Decisão.** Biblioteca `bcrypt` (binding nativo), com `SALT_ROUNDS = 10`, usada em `authService.register`/`login`.

**Justificativa.** Bcrypt é o padrão de mercado para hash de senha — incorpora salt automaticamente e tem custo computacional ajustável (`SALT_ROUNDS`) para acompanhar o aumento de poder de hardware ao longo do tempo. Preferido a `bcryptjs` (mais lento, pure JS) porque o binding nativo compilou sem problema no WSL.

**Trade-offs.** Dependência nativa (compilação via node-gyp) — se um ambiente futuro não conseguir compilar o binding, `bcryptjs` é o fallback direto (mesma API).

## 13. JWT simples, sem refresh token

**Contexto.** Autenticação precisa de um mecanismo de sessão para as rotas protegidas (gestão de links).

**Decisão.** Um único `accessToken` JWT (HS256, `JWT_SECRET` compartilhado) com TTL de 7 dias, emitido no login/registro. Sem refresh token nem revogação server-side.

**Justificativa.** Para o escopo atual (projeto de portfólio, sem necessidade de logout forçado em massa ou sessões de curta duração por segurança extrema), um único token de vida longa é suficiente e muito mais simples de implementar e testar do que um par access/refresh com rotação.

**Trade-offs.** Não há como revogar um token antes de expirar (ex.: logout não invalida o token no servidor, só remove do lado do cliente); um TTL de 7 dias é uma janela de exposição maior em caso de vazamento do token. Se o projeto evoluir para precisar de revogação, isso é candidato a uma decisão futura (blacklist em Redis, refresh token, etc.).

## 14. Erros como exceções + middleware central, não `Result<T, E>`

**Contexto.** Uma alternativa comum em Clean Architecture é fazer use cases retornarem um tipo `Result<T, E>` explícito em vez de lançar exceções (abordagem usada, por exemplo, em projetos maiores com múltiplos serviços).

**Decisão.** Services lançam subclasses de `AppError` (`ConflictError`, `UnauthorizedError`, ambas em `src/errors/`); um único middleware (`src/middlewares/error-handler.ts`) traduz qualquer `AppError` para a resposta HTTP correta, e qualquer outro erro para 500.

**Justificativa.** Para o tamanho atual do projeto, `Result<T, E>` adicionaria uma camada de indireção (checar `.ok`/`.error` em todo controller) sem ganho proporcional — o padrão de exceção + middleware central já é o idiomático em Express e mantém os controllers com uma linha por caminho de sucesso.

**Trade-offs.** Menos explícito no tipo de retorno da função (só olhando a assinatura de `authService.login`, não dá pra saber quais erros ela pode lançar sem ler o corpo) — mitigado por ter poucos tipos de erro (`AppError` e suas subclasses) e um middleware central único.

## 15. Validação de entrada com Zod + middleware genérico

**Contexto.** Toda rota que recebe corpo de requisição precisa validar formato antes de chegar no service.

**Decisão.** Schemas Zod por feature (`src/schemas/auth.schema.ts`) + um middleware genérico `validate(schema)` (`src/middlewares/validate.ts`) que roda antes do controller, responde 400 com `fieldErrors` em caso de falha, e substitui `req.body` pelo dado já parseado/tipado.

**Justificativa.** Um único middleware reutilizável para qualquer schema evita duplicar lógica de validação em cada controller; o tipo TypeScript do DTO vem do próprio schema (`z.infer`), sem necessidade de manter uma interface e um schema em sincronia manualmente.

**Trade-offs.** Nenhum significativo neste escopo — é o padrão mais direto disponível sem introduzir um framework de validação mais pesado.

## 16. Slug gerado aleatoriamente, com checagem de unicidade no service

**Contexto.** O `slug` de `Link` precisa ser curto (para caber num link compartilhável), único e não deve permitir que alguém adivinhe outros slugs existentes.

**Decisão.** `generateSlug()` (`src/utils/slug.ts`) gera 7 caracteres a partir de `crypto.randomBytes` em base64url. O `linkService` gera um candidato, verifica unicidade via `linkRepository.findBySlug`, e tenta de novo em caso de colisão (até 5 tentativas antes de falhar com 500).

**Justificativa.** Não sequencial — diferente de um contador incremental, não permite estimar quantos links existem nem "adivinhar" slugs vizinhos. `crypto.randomBytes` é criptograficamente aleatório, ao contrário de `Math.random()`. Checar unicidade antes de criar evita depender de capturar o erro de constraint única do Postgres.

**Trade-offs.** Uma pequena janela teórica de race condition entre o `findBySlug` e o `create` (dois requests simultâneos gerando o mesmo slug) — mitigada pela baixíssima probabilidade de colisão em 7 caracteres de um alfabeto de 64 símbolos, mas não eliminada; se isso importar no futuro, a constraint `@unique` do Postgres ainda barra o segundo insert (o request falharia com erro 500 em vez de um retry limpo).

## 17. Registro de clique assíncrono, depois do redirect

**Contexto.** `GET /:slug` precisa redirecionar o visitante o mais rápido possível — é a rota pública mais sensível a latência do sistema — mas também precisa gravar um `Click` a cada acesso bem-sucedido.

**Decisão.** `redirectController.redirect` chama `res.redirect(302, ...)` primeiro; só depois dispara `clickService.register(...)` sem `await`, com um `.catch` que só loga o erro (`console.error`).

**Justificativa.** O visitante nunca deveria esperar uma escrita no Postgres para ser redirecionado — a gravação do clique é uma preocupação secundária (analytics) frente ao objetivo primário da rota (redirecionar). Separar as duas coisas no tempo evita que uma falha ou lentidão no banco vire uma falha ou lentidão visível do redirecionamento.

**Trade-offs.** Se o processo cair exatamente entre o redirect e a gravação do clique, aquele clique específico se perde — não há garantia de entrega (não é uma fila persistente, é só uma promise solta). Aceitável para analytics best-effort; inaceitável se o requisito virasse "contagem de cliques auditável/exata".

## 18. Hash de IP com SHA-256 simples, sem salt

**Contexto.** `Click.ipHash` precisa identificar a origem de um clique sem guardar o IP em texto puro (ver [decisão #7](#7-iphash-em-vez-de-ip-bruto)).

**Decisão.** `hashIp()` (`src/utils/hash.ts`) aplica `sha256` direto sobre o IP, sem salt/pepper.

**Justificativa.** O objetivo aqui é reduzir a superfície de dados sensíveis armazenados, não construir uma defesa criptográfica contra um atacante dedicado tentando reverter hashes de IP (um pepper ajudaria contra rainbow tables, mas o modelo de ameaça deste projeto não pede esse nível).

**Trade-offs.** Tecnicamente reversível por força bruta/rainbow table dado o espaço pequeno de IPv4 — se a exigência de privacidade subir (ex.: produção real com dados de usuários reais), um pepper via variável de ambiente é o próximo passo natural.

## 19. Detecção de dispositivo por heurística própria, sem biblioteca de UA parsing

**Contexto.** `Click.dispositivo` precisa de uma categoria simples (mobile/tablet/desktop) a partir do header `User-Agent`.

**Decisão.** `detectDevice()` (`src/utils/device.ts`) usa três regex simples sobre o `User-Agent` em vez de uma biblioteca como `ua-parser-js`.

**Justificativa.** O produto só precisa de uma categoria grosseira para o dashboard de analytics, não o modelo/versão exatos do dispositivo — uma dependência inteira para isso seria desproporcional ao que é efetivamente usado.

**Trade-offs.** Heurística menos precisa que uma lib dedicada (ex.: pode classificar um user-agent incomum errado); se o analytics precisar de granularidade maior (SO, navegador, versão), trocar por uma biblioteca de UA parsing é a evolução natural aqui.

## 20. Agregação de analytics em memória, não com SQL bruto

**Contexto.** `GET /api/links/:id/analytics` precisa agrupar cliques por dia, dispositivo, referrer e país — agregações que normalmente pedem `GROUP BY`/`DATE_TRUNC` em SQL.

**Decisão.** `analyticsService` busca todos os cliques do link (só os 4 campos necessários, via `clickRepository.findAllByLinkId`) e agrega com `Map` em JavaScript, não com `$queryRaw` nem `groupBy` do Prisma para o agrupamento por dia.

**Justificativa.** No volume de cliques esperado por link nesta escala de projeto, trazer os registros para a aplicação e agregar ali é simples, type-safe (sem SQL bruto para manter/parametrizar) e fácil de testar unitariamente — as funções de agregação são puras (`aggregate`, `aggregateByDay`), sem precisar de um banco rodando para testar.

**Trade-offs.** Não escala para um link com milhões de cliques — traria todos os registros para a memória em cada request de analytics. Se isso se tornar um problema real, a evolução natural é mover a agregação por dia para SQL (`DATE_TRUNC` + `GROUP BY`) e paginar/cachear o resultado.

## 21. Dois níveis de teste: unitário (com mocks) + integração (com banco real)

**Contexto.** Precisava decidir a estratégia de teste antes de escrever qualquer teste — em particular, se integração deveria mockar o Prisma/banco ou usar um Postgres real.

**Decisão.** Testes unitários (`src/**/*.test.ts`, colocados ao lado do código) mockam o(s) repositório(s) com `vi.mock(...)` e testam só a lógica do service. Testes de integração (`tests/integration/*.test.ts`) sobem a `app` do Express de verdade via `supertest` e batem num Postgres real de teste (`tracer_test`), sem nenhum mock de banco.

**Justificativa.** Um bug real já apareceu nesta sessão (o Prisma 7 exigindo driver adapter explícito) que um teste com Prisma mockado jamais capturaria — só um teste batendo num banco real revela esse tipo de problema de integração/configuração. Mockar o banco em teste de integração dá falsa confiança: o teste passa, mas o comportamento real com o driver/schema/constraints do Postgres nunca foi exercitado.

**Trade-offs.** Testes de integração são mais lentos que com um Prisma mockado (dependem de um Postgres rodando) e exigem setup de ambiente (banco `tracer_test`, migrations aplicadas) — mitigado por um `globalSetup` do Vitest que aplica as migrations automaticamente antes da suíte rodar.

## 22. Testes de integração rodam em sequência, não em paralelo

**Contexto.** Ao rodar a suíte pela primeira vez com o paralelismo padrão do Vitest (múltiplos arquivos de teste em processos/threads simultâneos), vários testes falharam de forma não-determinística: e-mail duplicado inesperado, violação de foreign key no cleanup, `res.body.user` undefined. A causa: todos os arquivos de teste de integração compartilham o mesmo banco físico (`tracer_test`) sem isolamento por transação — o `resetDatabase()` de um arquivo apagava dados que outro arquivo, rodando ao mesmo tempo, ainda estava usando no meio de um teste.

**Decisão.** `fileParallelism: false` no `vitest.config.ts` — todos os arquivos de teste rodam em sequência, nunca simultaneamente.

**Justificativa.** É a forma mais simples de eliminar a corrida sem reescrever a suíte inteira para isolar cada teste numa transação própria (um padrão mais avançado: abrir uma transação no `beforeEach` e sempre dar rollback no `afterEach`, nunca commitar). Para o tamanho atual da suíte, a perda de velocidade é pequena e a suíte fica determinística.

**Trade-offs.** A suíte não escala tão bem quanto poderia com paralelismo real conforme o número de testes de integração crescer. Se isso virar gargalo, a evolução natural é implementar isolamento por transação (cada teste roda dentro de uma transação que nunca é commitada) em vez de continuar serializando os arquivos.

## 23. Repositórios tipam o retorno explicitamente como `Promise<Model>`

**Contexto.** Ao escrever o teste unitário de `authService.register` com `userRepository.create` mockado, o `tsc` reclamou que o mock não satisfazia o tipo de retorno real do método — porque `prisma.user.create(...)` não retorna um `Promise<User>` simples, e sim um tipo "fluente" (`Prisma__UserClient`) com métodos extras de atalho para relações, que uma implementação de mock (`async (data) => ({...})`) não consegue satisfazer.

**Decisão.** Toda função de repositório que chama `create`/`findUnique`/`findFirst`/`update` do Prisma anota o retorno explicitamente como `Promise<Model>` (ou `Promise<Model | null>`), usando os tipos exportados por `src/generated/prisma/client` (`User`, `Link`, `Click`), em vez de deixar o TypeScript inferir o tipo fluente do Prisma.

**Justificativa.** O tipo fluente é um detalhe de implementação do Prisma (permite fazer `prisma.user.create(...).posts()` para buscar uma relação em cadeia) que os services e os testes nunca usam — expor o retorno como `Promise<Model>` simples é o contrato real que o repositório oferece ao resto da aplicação, e é o que torna o repositório mockável sem ginástica de tipos.

**Trade-offs.** Uma linha de anotação de tipo a mais em cada método de repositório que antes tinha o retorno inferido automaticamente — custo baixo, pago uma vez por método.

## 24. CI com um único workflow, Postgres real como serviço do job

**Contexto.** Precisava rodar a suíte de testes (que depende de um Postgres real, ver [decisão #21](#21-dois-níveis-de-teste-unitário-com-mocks--integração-com-banco-real)) automaticamente a cada push/PR.

**Decisão.** Um único workflow (`.github/workflows/ci.yml`), já que o Tracer é uma API só (diferente de um monorepo com múltiplos serviços, que justificaria um workflow por app). O job sobe um `postgres:16` como `services:` do próprio job do GitHub Actions, com as credenciais do banco de teste injetadas diretamente via `env:` do job (`DATABASE_URL`, `JWT_SECRET`) — sem depender de `.env`/`.env.test` (que são gitignored e não existem no runner). A ordem dos passos é `npm ci` (que já roda `prisma generate` via `postinstall`) → `typecheck` → `test` → `build`, do mais rápido/barato para o mais caro.

**Justificativa.** Testar contra um Postgres real no CI (em vez de mockar) mantém a mesma garantia da decisão #21 — sem isso, o CI passaria mesmo com uma regressão que só aparece contra o banco de verdade. Injetar env vars diretamente (em vez de commitar um `.env.test` ou tentar reconstruir o arquivo no runner) funciona porque o `dotenv.config()` chamado pelo `vitest.config.ts` e pelo `prisma.config.ts` nunca sobrescreve uma variável já definida em `process.env` — confirmado localmente rodando a suíte com as env vars setadas diretamente no shell (sem nenhum `.env.test` sendo lido).

**Trade-offs.** Não há passo de lint no CI ainda — o projeto não tem ESLint configurado; typecheck (`tsc --noEmit`), testes e build cobrem o que existe hoje. Se um linter for adicionado depois, o workflow ganha mais um passo. O `node-version-file: .nvmrc` faz o CI usar a mesma versão de Node do dev local (`22`) — uma única fonte de verdade para a versão, em vez de hardcodar o número no workflow.

## 25. Deploy no Render via Blueprint (`render.yaml`)

**Contexto.** Precisava de um link ao vivo público para o portfólio, com backend + Postgres gerenciado, sem depender de infraestrutura própria.

**Decisão.** Render, descrito como código em `render.yaml` na raiz do repo (um Blueprint: um Web Service + um Postgres, ambos no plano free). `startCommand` roda `npx prisma migrate deploy` antes de subir o servidor (`node dist/server.js`) — toda vez que uma nova versão sobe, o schema do banco de produção é atualizado automaticamente antes de aceitar tráfego. `JWT_SECRET` é gerado pelo próprio Render (`generateValue: true`); `DATABASE_URL` vem automaticamente do banco declarado no mesmo Blueprint (`fromDatabase`).

**Justificativa.** Descrever a infra como código (em vez de clicar tudo manualmente no painel do Render) é reprodutível e revisável — o `render.yaml` documenta a infraestrutura do mesmo jeito que o código documenta a aplicação. Render foi escolhido por ter um free tier com Postgres gerenciado e integração direta com GitHub, sem exigir cartão de crédito para o tier gratuito.

**Trade-offs.** O free tier do Render hiberna o Web Service depois de um tempo sem tráfego — o primeiro acesso depois de um período ocioso demora alguns segundos a mais (cold start) para acordar. O Postgres free do Render também não é permanente indefinidamente (checar o prazo atual no painel do Render ao criar). `cors()` no `app.ts` está liberado para qualquer origem por enquanto — sem uma URL de frontend definida ainda, restringir a origem teria que ser revisitado assim que o frontend for deployado.

## 26. `npm ci --include=dev` explícito no build do Render

**Contexto.** O primeiro deploy falhou no build com dezenas de `TS7016: Could not find a declaration file for module 'express'/'cors'/'bcrypt'/'jsonwebtoken'`, mesmo o `tsc` rodando normalmente.

**Decisão.** `buildCommand` no `render.yaml` passou a ser `npm ci --include=dev && npm run build` (em vez de só `npm ci && npm run build`).

**Justificativa.** O `npm` tem uma config `omit` cujo valor default vira `['dev']` automaticamente sempre que a env var `NODE_ENV=production` está setada — e o Blueprint já define `NODE_ENV: production` como env var do serviço, que o Render aplica também durante o build, não só no runtime. Isso fazia o `npm ci` pular silenciosamente as `devDependencies` — incluindo os `@types/*` de que o `tsc` precisa para compilar (o `tsc` em si rodava porque a imagem do Render traz um TypeScript disponível independente do `node_modules` local). `--include=dev` sobrescreve esse comportamento explicitamente, então funciona não importa o valor de `NODE_ENV`. Validado localmente reproduzindo o mesmo cenário (`NODE_ENV=production npm ci --include=dev`), instalação foi de 203 para 303 pacotes e o build passou limpo.

**Trade-offs.** Nenhum real — é estritamente uma correção de um comportamento surpreendente do npm, não uma troca de robustez por outra coisa.

## 27. Frontend em projeto separado (`frontend/`), design desenhado antes de codar

**Contexto.** Com o backend completo e em produção, faltava o dashboard (Fase 5 do roadmap). O projeto é peça de portfólio — a barra de qualidade visual importa tanto quanto a de código (ver decisão de escopo já registrada na memória do projeto).

**Decisão.** Stack: React + TypeScript + Vite + Tailwind CSS v4 (plugin `@tailwindcss/vite`, tokens de cor/fonte via `@theme` em `src/index.css`) + React Router + TanStack Query + Axios. Vive em `frontend/`, um projeto Node independente (`package.json` próprio) dentro do mesmo repositório — não é um monorepo com workspaces, é só uma pasta irmã do backend. Antes de escrever qualquer componente, o design (paleta, tipografia, botão/input/badge/card/stat-tile/tabela/gráfico/layout) foi desenhado e validado no Claude Design (claude.ai/design), e só depois replicado em React/Tailwind.

**Justificativa.** Vite é o padrão atual para SPA em React (substituiu CRA), TanStack Query evita reinventar cache/loading/error state de chamadas à API, Tailwind v4 elimina a config extra de temas do v3 (tokens direto no CSS via `@theme`). Projeto separado (em vez de servir o frontend pelo próprio Express) mantém o deploy do backend simples (Render Web Service) e permite hospedar o frontend como site estático depois, sem acoplar os dois processos de build. Desenhar primeiro no Claude Design forçou decisões de cor/espaçamento/hierarquia antes do código, e o skill `dataviz` validou objetivamente (script, não "olho") que a paleta escolhida (accent azul `#2A78D6`) passa em contraste e faixa de luminosidade antes de virar CSS.

**Trade-offs.** Dois `npm install`/dois servidores de dev rodando em paralelo para desenvolver localmente (documentado no README). CORS no backend (`cors()` sem restrição de origem) segue como está — ver trade-off já registrado na decisão #25, ainda não revisitado porque o frontend só roda local por enquanto. Sem SSR/meta tags dinâmicas (SPA puro) — aceitável para um dashboard atrás de login, que não precisa de SEO.
