import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../index.cjs' 

describe('Health endpoint', () => {

    it('GET /health should return ok true', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual( { ok: true } );
    });
});