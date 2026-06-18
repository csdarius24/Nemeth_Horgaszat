import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Development: query naplózás; Production: nincs query naplózás (PII/zaj elkerülése).
const isProduction = process.env.NODE_ENV === "production";

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: isProduction ? [] : ["query"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma;