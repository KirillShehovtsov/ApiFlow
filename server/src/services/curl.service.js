/**
 * Парсит строку curl-команды в объект запроса.
 *
 * Поддерживает:
 *   -X METHOD / --request METHOD
 *   -H "Key: Value" / --header "Key: Value"
 *   -d '...' / --data '...' / --data-raw '...'
 *   --url URL / позиционный URL
 *   -u user:pass (Basic Auth → заголовок Authorization)
 *   --compressed (игнорируем — просто убираем)
 */
export const parseCurl = (curlString) => {
  // Нормализуем: убираем переносы строк с обратным слешем, лишние пробелы
  const normalized = curlString
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .trim();

  // Токенизируем строку с учётом кавычек
  const tokens = tokenize(normalized);

  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
    throw new Error('String must start with "curl"');
  }

  let url = null;
  let method = null;
  const headers = {};
  let body = null;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Метод
    if (token === '-X' || token === '--request') {
      method = tokens[++i]?.toUpperCase();
      continue;
    }

    // Заголовок
    if (token === '-H' || token === '--header') {
      const raw = tokens[++i] || '';
      const colonIdx = raw.indexOf(':');
      if (colonIdx !== -1) {
        const key = raw.slice(0, colonIdx).trim();
        const val = raw.slice(colonIdx + 1).trim();
        headers[key] = val;
      }
      continue;
    }

    // Body
    if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii'].includes(token)) {
      body = normalizeCurlBody(tokens[++i] || '');
      continue;
    }

    // URL через флаг
    if (token === '--url') {
      url = tokens[++i];
      continue;
    }

    // Basic Auth → Authorization: Basic base64(user:pass)
    if (token === '-u' || token === '--user') {
      const creds = tokens[++i] || '';
      headers['Authorization'] = `Basic ${btoa(creds)}`;
      continue;
    }

    // Игнорируемые флаги без значения
    if (['--compressed', '--insecure', '-k', '-s', '--silent', '-L', '--location'].includes(token)) {
      continue;
    }

    // Игнорируемые флаги со значением
    if (['--max-time', '-m', '--connect-timeout', '--proxy', '-x', '--output', '-o'].includes(token)) {
      i++; // пропускаем следующий токен
      continue;
    }

    // Позиционный аргумент — URL (не начинается с -)
    if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  if (!url) {
    throw new Error('URL not found in curl command');
  }

  // Если метод не указан явно — определяем по наличию body
  if (!method) {
    method = body ? 'POST' : 'GET';
  }

  // Разбиваем URL на базовый + query params
  let baseUrl = url;
  const queryParams = {};

  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
    // Убираем query string из URL
    parsed.search = '';
    baseUrl = parsed.toString();
  } catch {
    // Если URL невалидный — оставляем как есть
  }

  return {
    method,
    url: baseUrl,
    headers,
    queryParams,
    body: body || '',
  };
};

/**
 * Разбивает строку на токены с учётом одинарных и двойных кавычек.
 * curl 'url' -H "Header: value" -d '{"key":"val"}'
 */
const tokenize = (str) => {
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (ch === '\\' && inDouble && i + 1 < str.length) {
      const nextCh = str[i + 1];
      if (nextCh === '"' || nextCh === '\\' || nextCh === '$' || nextCh === '`') {
        current += nextCh;
        i += 1;
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === ' ' && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
};

const normalizeCurlBody = (body) => {
  if (!body) return '';

  const trimmed = body.trim();
  if (!trimmed) return '';

  const looksLikeJson = (value) =>
    (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'));

  if (!looksLikeJson(trimmed)) return body;

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // Continue to fallback normalization
  }

  const unescaped = trimmed
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  try {
    const parsed = JSON.parse(unescaped);
    return JSON.stringify(parsed);
  } catch {
    return body;
  }
};
