import "dotenv/config";
import app from "./app";
import { prisma } from "./utils/prisma";

const PORT = process.env.PORT ?? 3000;

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
