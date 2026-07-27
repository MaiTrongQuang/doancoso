-- Order lifecycle additions for existing PostgreSQL deployments.
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'BARISTA';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SERVER';
ALTER TYPE "payment_provider" ADD VALUE IF NOT EXISTS 'INTERNAL';

CREATE TYPE "order_item_status" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE "payment_transaction_status" AS ENUM ('RECEIVED', 'APPLIED', 'DUPLICATE', 'CONFLICT', 'REJECTED');

ALTER TABLE "order_items"
  ADD COLUMN "status" "order_item_status" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "orders" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

CREATE TABLE "order_status_histories" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "from_status" "order_status",
  "to_status" "order_status" NOT NULL,
  "actor_user_id" INTEGER,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "payment_id" INTEGER,
  "provider" "payment_provider" NOT NULL,
  "provider_transaction_id" TEXT NOT NULL,
  "status" "payment_transaction_status" NOT NULL DEFAULT 'RECEIVED',
  "amount" INTEGER NOT NULL,
  "reference_code" TEXT,
  "raw_data" JSONB,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_configs" (
  "id" SERIAL NOT NULL,
  "table_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotated_at" TIMESTAMP(3),
  CONSTRAINT "qr_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" SERIAL NOT NULL,
  "actor_user_id" INTEGER,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_transactions_provider_transaction_id_key"
  ON "payment_transactions"("provider_transaction_id");
CREATE UNIQUE INDEX "qr_configs_table_id_key" ON "qr_configs"("table_id");
CREATE UNIQUE INDEX "qr_configs_token_hash_key" ON "qr_configs"("token_hash");
CREATE INDEX "order_status_histories_order_id_created_at_idx"
  ON "order_status_histories"("order_id", "created_at");
CREATE INDEX "order_status_histories_actor_user_id_created_at_idx"
  ON "order_status_histories"("actor_user_id", "created_at");
CREATE INDEX "payment_transactions_order_id_received_at_idx"
  ON "payment_transactions"("order_id", "received_at");
CREATE INDEX "payment_transactions_status_received_at_idx"
  ON "payment_transactions"("status", "received_at");
CREATE INDEX "qr_configs_active_expires_at_idx"
  ON "qr_configs"("active", "expires_at");
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx"
  ON "audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx"
  ON "audit_logs"("actor_user_id", "created_at");
CREATE UNIQUE INDEX "dining_sessions_one_open_per_table_idx"
  ON "dining_sessions"("table_id")
  WHERE "status" = 'OPEN';

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_price_non_negative_check" CHECK ("price" >= 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_total_amount_non_negative_check" CHECK ("total_amount" >= 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_non_negative_check" CHECK ("amount" >= 0);
ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_amount_non_negative_check" CHECK ("amount" >= 0);

ALTER TABLE "order_status_histories"
  ADD CONSTRAINT "order_status_histories_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "order_status_histories_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_transactions_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "qr_configs"
  ADD CONSTRAINT "qr_configs_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "cafe_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
