import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../lib/email.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendOtpEmail } from '../lib/email.js';

let app: FastifyInstance;

beforeAll(async () => { app = await createTestApp(); });
beforeEach(async () => { vi.clearAllMocks(); await cleanDb(); });
afterAll(async () => { await app.close(); });

describe('POST /auth/otp/request', () => {
  it('returns 200 and sends email', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(sendOtpEmail).toHaveBeenCalledWith('user@example.com', expect.stringMatching(/^\d{6}$/));
  });

  it('returns 400 if email missing', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INVALID_INPUT');
  });
});

describe('POST /auth/otp/verify', () => {
  it('returns JWT and refresh token on valid code', async () => {
    await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];

    const res = await app.inject({
      method: 'POST', url: '/auth/otp/verify',
      payload: { email: 'user@example.com', code },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ jwt: expect.any(String), refreshToken: expect.any(String) });
  });

  it('returns 401 on wrong code', async () => {
    await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    const res = await app.inject({
      method: 'POST', url: '/auth/otp/verify',
      payload: { email: 'user@example.com', code: '000000' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('returns a new JWT for a valid refresh token', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email: 'u@e.com' } });
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
    const verifyRes = await app.inject({
      method: 'POST', url: '/auth/otp/verify', payload: { email: 'u@e.com', code },
    });
    const { refreshToken } = verifyRes.json();

    const res = await app.inject({
      method: 'POST', url: '/auth/refresh', payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().jwt).toBeDefined();
  });
});

describe('POST /auth/signout', () => {
  it('revokes the refresh token', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email: 'u@e.com' } });
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
    const verifyRes = await app.inject({
      method: 'POST', url: '/auth/otp/verify', payload: { email: 'u@e.com', code },
    });
    const { jwt, refreshToken } = verifyRes.json();

    const signoutRes = await app.inject({
      method: 'POST', url: '/auth/signout',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(signoutRes.statusCode).toBe(200);

    const refreshRes = await app.inject({
      method: 'POST', url: '/auth/refresh', payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});
