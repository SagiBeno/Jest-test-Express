import request from 'supertest';
import { describe, it, expect } from 'vitest';
import apiModule from '../index.cjs' ;
const { app } = apiModule;

describe('Game by id endpoint', () => {

    it('GET /games/:id should return one game when id exists', async () => {
        const response = await request(app).get('/games/1');

        expect(response.body).toHaveProperty('id', 1);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('developer');
        expect(response.body).toHaveProperty('category_id');
        expect(response.body).toHaveProperty('category_name');
    });

    it('GET /games/:id should return 400 for invalid id', async () => {
        const response = await request(app).get('/games/abc');

        expect(response.status).toBe(400);
        expect(response.body).toEqual( { error: 'Invalid game id' } );
    });

    it('GET /games/:id should return 404 when game does not exist', async () => {
        const response = await request(app).get('/games/9999999');

        expect(response.status).toBe(404);
        expect(response.body).toEqual( { error: 'Game not found' } );
    });
});