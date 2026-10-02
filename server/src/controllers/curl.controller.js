import { parseCurl } from '../services/curl.service.js';

// POST /api/curl/parse
// Body: { curl: "curl https://..." }
// Возвращает распарсенный объект запроса
export const parse = (req, res, next) => {
  try {
    const curl = typeof req.body === 'string'
      ? req.body
      : req.body?.curl;

    if (!curl || typeof curl !== 'string') {
      return res.status(400).json({ success: false, message: 'curl string is required' });
    }

    const result = parseCurl(curl.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    // Ошибки парсинга — 400, не 500
    err.status = 400;
    next(err);
  }
};
