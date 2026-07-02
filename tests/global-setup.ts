import { execSync } from "node:child_process";

// Aplica as migrations existentes no banco de teste (tracer_test) antes de
// qualquer arquivo de teste rodar — nenhuma migration nova é gerada aqui.
export default function setup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
