import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { cachedJson, clientAddress, errorResponse, parseInput } from '@/controllers/http';
import { NotFoundError, RateLimitedError, ValidationError } from '@/lib/errors';

const policy = { maxAge: 60, sMaxAge: 600, staleWhileRevalidate: 60 };

describe('cachedJson', () => {
  it('sets CDN-ready cache headers and a strong ETag', async () => {
    const response = cachedJson(new Request('http://x/'), { a: 1 }, policy);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=60, s-maxage=600, stale-while-revalidate=60',
    );
    expect(response.headers.get('etag')).toMatch(/^"[\w-]+"$/);
    expect(await response.json()).toEqual({ a: 1 });
  });

  it('answers 304 with no body when the client already has this version', async () => {
    const etag = cachedJson(new Request('http://x/'), { a: 1 }, policy).headers.get('etag')!;
    const conditional = new Request('http://x/', {
      headers: { 'if-none-match': `W/${etag}, "other"` },
    });
    const response = cachedJson(conditional, { a: 1 }, policy);
    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
    expect(response.headers.get('etag')).toBe(etag);
  });

  it('changes the ETag when the body changes', () => {
    const tag = (body: unknown) =>
      cachedJson(new Request('http://x/'), body, policy).headers.get('etag');
    expect(tag({ a: 1 })).not.toBe(tag({ a: 2 }));
  });
});

describe('errorResponse', () => {
  it('maps application errors to their status and code', async () => {
    const response = errorResponse(new NotFoundError());
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'not_found' } });
  });

  it('includes field errors for invalid input and Retry-After when rate limited', async () => {
    const invalid = errorResponse(new ValidationError('x', { cep: ['ruim'] }));
    expect(await invalid.json()).toMatchObject({ error: { fieldErrors: { cep: ['ruim'] } } });
    expect(errorResponse(new RateLimitedError(7)).headers.get('retry-after')).toBe('7');
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const response = errorResponse(new Error('connection string with password'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('password');
  });
});

describe('parseInput', () => {
  const schema = z.object({ cep: z.string().check(z.length(8, 'CEP com 8 números')) });

  it('returns parsed data', () => {
    expect(parseInput(schema, { cep: '37540000' })).toEqual({ cep: '37540000' });
  });

  it('throws a ValidationError carrying per-field messages', () => {
    expect(() => parseInput(schema, { cep: '1' })).toThrow(ValidationError);
    try {
      parseInput(schema, { cep: '1' });
    } catch (error) {
      expect((error as ValidationError).fieldErrors).toEqual({ cep: ['CEP com 8 números'] });
      expect((error as ValidationError).message).toBe('CEP com 8 números');
    }
  });
});

describe('clientAddress', () => {
  it('uses the first X-Forwarded-For hop', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe(
      '203.0.113.9',
    );
    expect(clientAddress(new Headers())).toBe('unknown');
  });
});
