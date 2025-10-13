-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPhase" TEXT,
    "phaseStartTime" TIMESTAMP(3),
    "phaseEndTime" TIMESTAMP(3),
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "winner" TEXT,
    "nightVictim" TEXT,
    "playerCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "eliminatedInRound" INTEGER,
    "eliminationType" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionMessage" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inReplyToId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turn" INTEGER NOT NULL,

    CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NightMessage" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "inReplyToId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turn" INTEGER NOT NULL,

    CONSTRAINT "NightMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "phaseType" TEXT NOT NULL DEFAULT 'VOTING',
    "voteOrder" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedGame" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE INDEX "Game_status_createdAt_idx" ON "Game"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Player_gameId_isAlive_idx" ON "Player"("gameId", "isAlive");

-- CreateIndex
CREATE INDEX "Player_gameId_role_idx" ON "Player"("gameId", "role");

-- CreateIndex
CREATE INDEX "Player_gameId_role_isAlive_idx" ON "Player"("gameId", "role", "isAlive");

-- CreateIndex
CREATE INDEX "Player_gameId_isAlive_role_idx" ON "Player"("gameId", "isAlive", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_position_key" ON "Player"("gameId", "position");

-- CreateIndex
CREATE INDEX "DiscussionMessage_gameId_roundNumber_timestamp_idx" ON "DiscussionMessage"("gameId", "roundNumber", "timestamp");

-- CreateIndex
CREATE INDEX "DiscussionMessage_gameId_playerId_idx" ON "DiscussionMessage"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "DiscussionMessage_inReplyToId_idx" ON "DiscussionMessage"("inReplyToId");

-- CreateIndex
CREATE INDEX "DiscussionMessage_gameId_timestamp_idx" ON "DiscussionMessage"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "NightMessage_gameId_roundNumber_timestamp_idx" ON "NightMessage"("gameId", "roundNumber", "timestamp");

-- CreateIndex
CREATE INDEX "NightMessage_gameId_playerId_idx" ON "NightMessage"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "Vote_gameId_roundNumber_idx" ON "Vote"("gameId", "roundNumber");

-- CreateIndex
CREATE INDEX "Vote_gameId_voterId_idx" ON "Vote"("gameId", "voterId");

-- CreateIndex
CREATE INDEX "Vote_gameId_targetId_idx" ON "Vote"("gameId", "targetId");

-- CreateIndex
CREATE INDEX "Vote_gameId_roundNumber_targetId_idx" ON "Vote"("gameId", "roundNumber", "targetId");

-- CreateIndex
CREATE INDEX "GameEvent_gameId_timestamp_idx" ON "GameEvent"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "GameEvent_type_timestamp_idx" ON "GameEvent"("type", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SharedGame_gameId_key" ON "SharedGame"("gameId");

-- CreateIndex
CREATE INDEX "SharedGame_gameId_idx" ON "SharedGame"("gameId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "DiscussionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightMessage" ADD CONSTRAINT "NightMessage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightMessage" ADD CONSTRAINT "NightMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightMessage" ADD CONSTRAINT "NightMessage_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "NightMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGame" ADD CONSTRAINT "SharedGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
