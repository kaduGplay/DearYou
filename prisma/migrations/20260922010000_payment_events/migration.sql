-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "metaAttribution" JSONB,
ADD COLUMN     "pixGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "providerCheckedAt" TIMESTAMP(3),
ADD COLUMN     "webhookReceivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MetaConversion" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "MetaConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaConversion_status_nextAttemptAt_idx" ON "MetaConversion"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MetaConversion" ADD CONSTRAINT "MetaConversion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
