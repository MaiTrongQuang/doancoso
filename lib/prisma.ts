import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaClientOptions = {
  transactionOptions: {
    maxWait: 10_000,
    timeout: 20_000,
  },
} satisfies ConstructorParameters<typeof PrismaClient>[0];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
