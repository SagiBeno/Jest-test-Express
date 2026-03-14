import request from 'supertest';
import { describe, it, expect } from 'vitest';
import apiModule from '../index.cjs' ;
const { app } = apiModule;

describe('Health endpoint', () => {

    it('GET /health should return ok true', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual( { ok: true } );
    });
});