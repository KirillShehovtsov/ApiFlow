BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Collection] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [userId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Collection_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Collection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Request] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [method] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [headers] NVARCHAR(1000) NOT NULL CONSTRAINT [Request_headers_df] DEFAULT '{}',
    [queryParams] NVARCHAR(1000) NOT NULL CONSTRAINT [Request_queryParams_df] DEFAULT '{}',
    [body] NVARCHAR(1000),
    [collectionId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Request_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Request_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Environment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [userId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Environment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Environment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EnvironmentVariable] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [environmentId] INT NOT NULL,
    CONSTRAINT [EnvironmentVariable_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TestScript] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [requestId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TestScript_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TestScript_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TestRun] (
    [id] INT NOT NULL IDENTITY(1,1),
    [testScriptId] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TestRun_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TestRun_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TestResult] (
    [id] INT NOT NULL IDENTITY(1,1),
    [runId] INT NOT NULL,
    [assertion] NVARCHAR(1000) NOT NULL,
    [passed] BIT NOT NULL,
    [message] NVARCHAR(1000),
    CONSTRAINT [TestResult_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RequestHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [requestData] NVARCHAR(1000) NOT NULL,
    [responseData] NVARCHAR(1000) NOT NULL,
    [durationMs] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RequestHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RequestHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Collection] ADD CONSTRAINT [Collection_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Request] ADD CONSTRAINT [Request_collectionId_fkey] FOREIGN KEY ([collectionId]) REFERENCES [dbo].[Collection]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Environment] ADD CONSTRAINT [Environment_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EnvironmentVariable] ADD CONSTRAINT [EnvironmentVariable_environmentId_fkey] FOREIGN KEY ([environmentId]) REFERENCES [dbo].[Environment]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TestScript] ADD CONSTRAINT [TestScript_requestId_fkey] FOREIGN KEY ([requestId]) REFERENCES [dbo].[Request]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TestRun] ADD CONSTRAINT [TestRun_testScriptId_fkey] FOREIGN KEY ([testScriptId]) REFERENCES [dbo].[TestScript]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TestResult] ADD CONSTRAINT [TestResult_runId_fkey] FOREIGN KEY ([runId]) REFERENCES [dbo].[TestRun]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RequestHistory] ADD CONSTRAINT [RequestHistory_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
