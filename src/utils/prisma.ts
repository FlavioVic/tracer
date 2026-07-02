import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Prisma 7 exige um driver adapter explícito — o datasource do schema
// não basta mais para abrir a conexão sozinho.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Singleton: em desenvolvimento o hot-reload recriaria instâncias infinitas sem isso
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
