BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[LoadTestReport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [requestData] NVARCHAR(max) NOT NULL,
    [summaryData] NVARCHAR(max) NOT NULL,
    [performanceData] NVARCHAR(max) NOT NULL,
    [statusCodes] NVARCHAR(max) NOT NULL,
    [errorsData] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoadTestReport_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoadTestReport_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LoadTestReport_jobId_key] UNIQUE NONCLUSTERED ([jobId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoadTestReport_userId_idx] ON [dbo].[LoadTestReport]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoadTestReport_jobId_idx] ON [dbo].[LoadTestReport]([jobId]);

-- AddForeignKey
ALTER TABLE [dbo].[LoadTestReport] ADD CONSTRAINT [LoadTestReport_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
