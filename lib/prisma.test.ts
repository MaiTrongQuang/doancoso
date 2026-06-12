import { strict as assert } from "node:assert";
import { prisma } from "./prisma";

type PrismaClientWithEngineConfig = typeof prisma & {
  _engineConfig?: {
    transactionOptions?: {
      maxWait?: number;
      timeout?: number;
    };
  };
};

const transactionOptions = (prisma as PrismaClientWithEngineConfig)._engineConfig
  ?.transactionOptions;

assert.ok(transactionOptions, "Prisma transaction options should be configured.");
assert.equal(transactionOptions.maxWait, 10_000);
assert.equal(transactionOptions.timeout, 20_000);

void prisma.$disconnect();
