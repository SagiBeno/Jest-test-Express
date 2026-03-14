import request from 'supertest';
import { describe, it, expect } from 'vitest';
import apiModule from '../index.cjs' ;
const { app } = apiModule;

describe('Categories endpoint', () => {

    it('GET /categories should return category list', async () => {
        const response = await request(app).get('/categories');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
    });
});