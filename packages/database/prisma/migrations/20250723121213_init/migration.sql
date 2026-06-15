-- CreateTable
CREATE TABLE "Guilds" (
    "guildId" TEXT NOT NULL,
    "languagePreference" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guilds_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanels" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panelChannelId" TEXT NOT NULL,
    "panelMessageId" TEXT,
    "panelContent" TEXT,
    "openContent" TEXT,
    "closeButtonLabel" TEXT NOT NULL,
    "closeButtonEmoji" TEXT,
    "closeButtonStyle" TEXT NOT NULL,
    "parentCategoryId" TEXT,
    "channelNameFormat" TEXT NOT NULL,
    "closeContent" TEXT,
    "closeConfirmButtonLabel" TEXT NOT NULL,
    "closeConfirmButtonEmoji" TEXT,
    "closeConfirmButtonStyle" TEXT NOT NULL,
    "requireCloseReason" BOOLEAN NOT NULL,
    "logsChannelId" TEXT,
    "includeTranscript" BOOLEAN NOT NULL,
    "dmNotification" BOOLEAN NOT NULL,
    "dmTranscript" BOOLEAN NOT NULL,
    "userCanClose" BOOLEAN NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPanels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanelButton" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "style" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPanelButton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanelSelectMenu" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "placeholder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPanelSelectMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanelSelectOption" (
    "id" TEXT NOT NULL,
    "selectMenuId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPanelSelectOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEmbed" (
    "id" SERIAL NOT NULL,
    "panelId" TEXT,
    "openPanelId" TEXT,
    "closePanelId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "color" INTEGER,
    "url" TEXT,
    "authorName" TEXT,
    "authorIconUrl" TEXT,
    "authorUrl" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "footer" TEXT,
    "footerIconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketEmbed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEmbedField" (
    "id" SERIAL NOT NULL,
    "embedId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "inline" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketEmbedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "userId" TEXT NOT NULL,
    "userTag" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "banner" TEXT,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guilds_guildId_key" ON "Guilds"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_sessionId_key" ON "Sessions"("sessionId");

-- CreateIndex
CREATE INDEX "Sessions_userId_idx" ON "Sessions"("userId");

-- CreateIndex
CREATE INDEX "TicketPanels_guildId_idx" ON "TicketPanels"("guildId");

-- CreateIndex
CREATE INDEX "TicketPanels_panelChannelId_idx" ON "TicketPanels"("panelChannelId");

-- CreateIndex
CREATE INDEX "TicketPanels_authorId_idx" ON "TicketPanels"("authorId");

-- CreateIndex
CREATE INDEX "TicketPanelButton_panelId_idx" ON "TicketPanelButton"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanelButton_panelId_position_key" ON "TicketPanelButton"("panelId", "position");

-- CreateIndex
CREATE INDEX "TicketPanelSelectMenu_panelId_idx" ON "TicketPanelSelectMenu"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanelSelectMenu_panelId_position_key" ON "TicketPanelSelectMenu"("panelId", "position");

-- CreateIndex
CREATE INDEX "TicketPanelSelectOption_selectMenuId_idx" ON "TicketPanelSelectOption"("selectMenuId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanelSelectOption_selectMenuId_position_key" ON "TicketPanelSelectOption"("selectMenuId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanelSelectOption_selectMenuId_value_key" ON "TicketPanelSelectOption"("selectMenuId", "value");

-- CreateIndex
CREATE INDEX "TicketEmbed_panelId_idx" ON "TicketEmbed"("panelId");

-- CreateIndex
CREATE INDEX "TicketEmbed_openPanelId_idx" ON "TicketEmbed"("openPanelId");

-- CreateIndex
CREATE INDEX "TicketEmbed_closePanelId_idx" ON "TicketEmbed"("closePanelId");

-- CreateIndex
CREATE INDEX "TicketEmbedField_embedId_idx" ON "TicketEmbedField"("embedId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_panelId_idx" ON "Ticket"("panelId");

-- CreateIndex
CREATE INDEX "Ticket_channelId_idx" ON "Ticket"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_userId_key" ON "Users"("userId");

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanels" ADD CONSTRAINT "TicketPanels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guilds"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanels" ADD CONSTRAINT "TicketPanels_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanelButton" ADD CONSTRAINT "TicketPanelButton_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanelSelectMenu" ADD CONSTRAINT "TicketPanelSelectMenu_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPanelSelectOption" ADD CONSTRAINT "TicketPanelSelectOption_selectMenuId_fkey" FOREIGN KEY ("selectMenuId") REFERENCES "TicketPanelSelectMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmbed" ADD CONSTRAINT "TicketEmbed_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmbed" ADD CONSTRAINT "TicketEmbed_openPanelId_fkey" FOREIGN KEY ("openPanelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmbed" ADD CONSTRAINT "TicketEmbed_closePanelId_fkey" FOREIGN KEY ("closePanelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmbedField" ADD CONSTRAINT "TicketEmbedField_embedId_fkey" FOREIGN KEY ("embedId") REFERENCES "TicketEmbed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
