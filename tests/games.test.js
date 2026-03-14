import request from 'supertest';
import { describe, it, expect, afterEach, vi } from 'vitest';
import apiModule from '../index.cjs' ;
const { app, connection } = apiModule;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Games endpoint', () => {

    describe('Get /games', () => {
        it('should return games list', async () => {
            const response = await request(app).get('/games');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('developer');
            expect(response.body[0]).toHaveProperty('category_id');
            expect(response.body[0]).toHaveProperty('category_name');
        });
    });

    describe('GET /games/:id', () => {

        it('should return one game when id exists', async () => {
            const response = await request(app).get('/games/1');

            expect(response.body).toHaveProperty('id', 1);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('developer');
            expect(response.body).toHaveProperty('category_id');
            expect(response.body).toHaveProperty('category_name');
        });

        it('should return 400 for invalid id', async () => {
            const response = await request(app).get('/games/abc');

            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'Invalid game id' } );
        });

        it('return 404 when game does not exist', async () => {
            const response = await request(app).get('/games/9999999');

            expect(response.status).toBe(404);
            expect(response.body).toEqual( { error: 'Game not found' } );
        });
    });

    describe('POST /games', () => {

        it('should create a game and return it', async () => {
            vi.spyOn(connection, 'query')
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, { insertedId: 5 })
                })
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [
                        {
                            id: '5',
                            name: 'Portal',
                            developer: 'Valve',
                            category_id: 2,
                            category_name: 'first person shooter'
                        }
                    ])
                })
            
                const response = await request(app)
                    .post('/games')
                    .send({
                        name: 'Portal',
                        developer: 'Valve',
                        category_id: 2
                    });
                
                expect(response.status).toBe(201);
                expect(response.body).toEqual(
                    {
                        id: '5',
                        name: 'Portal',
                        developer: 'Valve',
                        category_id: 2,
                        category_name: 'first person shooter'
                    }
                );
        });

        it('should retrun 400 when name is missing', async () => {
            const response = await request(app)
                .post('/games')
                .send({
                    category_id: 1
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'name and category_id are required' } );
        });

        it('should return 400 when category_id is not integer', async () => {
            const response = await request(app)
                .post('/games')
                .send({
                    name: 'Portal',
                    developer: 'Valve',
                    category_id: 'id'
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'category_id must be an integer or null' } );
        });
    });

});