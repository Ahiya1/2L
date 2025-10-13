-- AlterTable
ALTER TABLE "Game" ADD COLUMN "nightVictim" TEXT;
ALTER TABLE "Game" ADD COLUMN "phaseStartTime" DATETIME;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "eliminatedInRound" INTEGER;
ALTER TABLE "Player" ADD COLUMN "eliminationType" TEXT;

-- CreateTable
CREATE TABLE "NightMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inReplyToId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turn" INTEGER NOT NULL,
    CONSTRAINT "NightMessage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NightMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NightMessage_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "NightMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "phaseType" TEXT NOT NULL DEFAULT 'VOTING',
    "voteOrder" INTEGER NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("gameId", "id", "justification", "roundNumber", "targetId", "timestamp", "voterId") SELECT "gameId", "id", "justification", "roundNumber", "targetId", "timestamp", "voterId" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE INDEX "Vote_gameId_roundNumber_idx" ON "Vote"("gameId", "roundNumber");
CREATE INDEX "Vote_gameId_voterId_idx" ON "Vote"("gameId", "voterId");
CREATE INDEX "Vote_gameId_targetId_idx" ON "Vote"("gameId", "targetId");
CREATE INDEX "Vote_gameId_roundNumber_targetId_idx" ON "Vote"("gameId", "roundNumber", "targetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NightMessage_gameId_roundNumber_timestamp_idx" ON "NightMessage"("gameId", "roundNumber", "timestamp");

-- CreateIndex
CREATE INDEX "NightMessage_gameId_playerId_idx" ON "NightMessage"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "Player_gameId_role_isAlive_idx" ON "Player"("gameId", "role", "isAlive");
