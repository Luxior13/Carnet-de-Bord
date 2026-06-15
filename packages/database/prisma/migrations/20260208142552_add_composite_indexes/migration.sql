-- CreateIndex
CREATE INDEX "BankAccount_isActive_balance_idx" ON "public"."BankAccount"("isActive", "balance");

-- CreateIndex
CREATE INDEX "Membership_memberId_status_idx" ON "public"."Membership"("memberId", "status");

-- CreateIndex
CREATE INDEX "Transaction_status_paidDate_idx" ON "public"."Transaction"("status", "paidDate");
