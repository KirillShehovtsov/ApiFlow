-- Удаляем default constraints перед изменением типов
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql += 'ALTER TABLE [' + t.name + '] DROP CONSTRAINT [' + dc.name + '];'
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON c.object_id = t.object_id
WHERE t.name IN ('Request') AND c.name IN ('headers', 'queryParams', 'body');

EXEC sp_executesql @sql;

-- Меняем типы столбцов в Request
ALTER TABLE [Request] ALTER COLUMN [headers] NVARCHAR(MAX) NOT NULL;
ALTER TABLE [Request] ALTER COLUMN [queryParams] NVARCHAR(MAX) NOT NULL;
ALTER TABLE [Request] ALTER COLUMN [body] NVARCHAR(MAX) NULL;

-- Возвращаем default значения
ALTER TABLE [Request] ADD CONSTRAINT [Request_headers_df] DEFAULT '{}' FOR [headers];
ALTER TABLE [Request] ADD CONSTRAINT [Request_queryParams_df] DEFAULT '{}' FOR [queryParams];

-- Меняем типы в RequestHistory
ALTER TABLE [RequestHistory] ALTER COLUMN [requestData] NVARCHAR(MAX) NOT NULL;
ALTER TABLE [RequestHistory] ALTER COLUMN [responseData] NVARCHAR(MAX) NOT NULL;

-- Меняем тип в TestScript
ALTER TABLE [TestScript] ALTER COLUMN [code] NVARCHAR(MAX) NOT NULL;