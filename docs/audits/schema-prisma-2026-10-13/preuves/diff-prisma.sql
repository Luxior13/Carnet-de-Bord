-- DropIndex
DROP INDEX "Person_normalizedFirstName_prefix_idx";

-- DropIndex
DROP INDEX "Person_normalizedLastName_prefix_idx";

-- DropIndex
DROP INDEX "Person_normalizedNickname_prefix_idx";

-- CreateIndex
CREATE INDEX "Person_normalizedNickname_prefix_idx" ON "Person"("normalizedNickname" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "Person_normalizedFirstName_prefix_idx" ON "Person"("normalizedFirstName" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "Person_normalizedLastName_prefix_idx" ON "Person"("normalizedLastName" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "PersonEmail_normalizedEmail_prefix_idx" ON "PersonEmail"("normalizedEmail" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "PersonPhone_normalizedPhone_prefix_idx" ON "PersonPhone"("normalizedPhone" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "PersonSocialProfile_normalizedIdentifier_prefix_idx" ON "PersonSocialProfile"("normalizedIdentifier" varchar_pattern_ops);
