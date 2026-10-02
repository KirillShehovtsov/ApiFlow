import { parseCurl } from '../src/services/curl.service.js';

describe('parseCurl', () => {
  test('parseCurl GET request', () => {
    const result = parseCurl(
      'curl https://jsonplaceholder.typicode.com/posts/1'
    );

    expect(result.method).toBe('GET');
    expect(result.url).toBe('https://jsonplaceholder.typicode.com/posts/1');
    expect(result.body).toBe('');
  });

  test('parseCurl POST with JSON body', () => {
    const result = parseCurl(
      "curl -X POST https://jsonplaceholder.typicode.com/posts -H 'Content-Type: application/json' -d '{\"title\":\"t\"}'"
    );

    expect(result.method).toBe('POST');
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toContain('title');
  });

  test('parseCurl rejects string without curl prefix', () => {
    expect(() => parseCurl('wget https://example.com')).toThrow(
      'String must start with "curl"'
    );
  });

  test('parseCurl rejects command without URL', () => {
    expect(() => parseCurl('curl -X GET')).toThrow('URL not found');
  });
});
