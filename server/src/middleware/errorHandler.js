// src/middleware/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  // Невалидный JSON в body (падает в express.json до контроллера)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body. Use valid JSON payload.',
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[${req.method}] ${req.path} → ${status}: ${message}`);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};