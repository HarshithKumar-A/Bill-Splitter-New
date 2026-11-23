CREATE TYPE "PlanItemType" AS ENUM ('STAY', 'TRAVEL', 'ACTIVITY');

CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT,
    "type" "PlanItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "locationFrom" TEXT,
    "locationTo" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "bookingRef" TEXT,
    "notes" TEXT,
    "participantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedExpenseId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItineraryItem_linkedExpenseId_key" ON "ItineraryItem"("linkedExpenseId");
CREATE INDEX "ItineraryItem_groupId_startDate_startTime_sortOrder_idx" ON "ItineraryItem"("groupId", "startDate", "startTime", "sortOrder");

ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_linkedExpenseId_fkey" FOREIGN KEY ("linkedExpenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
