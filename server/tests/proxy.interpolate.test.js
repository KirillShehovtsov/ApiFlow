import { interpolate, interpolateObject } from '../src/services/proxy.service.js';

describe('environment variable interpolation', () => {
  test('interpolate replaces known variables', () => {
    const url = interpolate('{{baseUrl}}/posts/{{postId}}', {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      postId: '1',
    });

    expect(url).toBe('https://jsonplaceholder.typicode.com/posts/1');
  });

  test('interpolate keeps unknown placeholders', () => {
    const url = interpolate('{{baseUrl}}/posts/{{missing}}', {
      baseUrl: 'https://api.example.com',
    });

    expect(url).toBe('https://api.example.com/posts/{{missing}}');
  });

  test('interpolateObject applies substitution to header values', () => {
    const headers = interpolateObject(
      { Authorization: 'Bearer {{token}}', '': 'skip' },
      { token: 'abc123' }
    );

    expect(headers.Authorization).toBe('Bearer abc123');
    expect(headers['']).toBeUndefined();
  });
});
