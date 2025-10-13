-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "currentPhase" TEXT,
    "phaseEndTime" DATETIME,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "winner" TEXT,
    "playerCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscussionMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inReplyToId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turn" INTEGER NOT NULL,
    CONSTRAINT "DiscussionMessage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionMessage_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "DiscussionMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE INDEX "Player_gameId_isAlive_idx" ON "Player"("gameId", "isAlive");

-- CreateIndex
CREATE INDEX "Player_gameId_role_idx" ON "Player"("gameId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_position_key" ON "Player"("gameId", "position");

-- CreateIndex
CREATE INDEX "DiscussionMessage_gameId_roundNumber_timestamp_idx" ON "DiscussionMessage"("gameId", "roundNumber", "timestamp");

-- CreateIndex
CREATE INDEX "DiscussionMessage_gameId_playerId_idx" ON "DiscussionMessage"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "DiscussionMessage_inReplyToId_idx" ON "DiscussionMessage"("inReplyToId");

-- CreateIndex
CREATE INDEX "Vote_gameId_roundNumber_idx" ON "Vote"("gameId", "roundNumber");

-- CreateIndex
CREATE INDEX "Vote_gameId_voterId_idx" ON "Vote"("gameId", "voterId");

-- CreateIndex
CREATE INDEX "Vote_gameId_targetId_idx" ON "Vote"("gameId", "targetId");

-- CreateIndex
CREATE INDEX "GameEvent_gameId_timestamp_idx" ON "GameEvent"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "GameEvent_type_timestamp_idx" ON "GameEvent"("type", "timestamp");
