import { config as loadEnv } from "dotenv";

// Precisa rodar antes de qualquer import de código da aplicação (Prisma,
// JWT_SECRET etc. são lidos de process.env na primeira importação do módulo).
loadEnv({ path: ".env.test" });

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./tests/global-setup.ts",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 10000,
    hookTimeout: 20000,
    // Os testes de integração compartilham um único banco Postgres real
    // (tracer_test) sem isolamento por transação — rodar arquivos em
    // paralelo causa corrida entre o cleanup de um arquivo e os dados
    // que outro ainda está usando. Mais lento, mas determinístico.
    fileParallelism: false,
  },
});
