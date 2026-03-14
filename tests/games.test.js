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

        it('should return 400 when name is empty string', async () => {
            const response = await request(app)
                .post('/games')
                .send({
                    name: '',
                    developer: 'Valve',
                    category_id: 1
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'name must be a non-empty string' } );
        });

        it('should return 400 when developer is not a string or null', async () => {
            const response = await request(app)
                .post('/games')
                .send({
                    name: 'Portal',
                    developer: 1,
                    category_id: 1
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'developer must be a string or null' } );
        });

        it('should return 400 when category_id does not exist', async () => {
            vi.spyOn(connection, 'query').mockImplementationOnce((sql, params, callback) => {
                callback({
                    code: 'ER_NO_REFERENCED_ROW_2',
                    message: 'Foreign key constraint fails'
                })
            });

            const response = await request(app)
                .post('/games')
                .send({
                    name: 'Portal',
                    developer: 'Valve',
                    category_id: 99999
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'category_id does not exist' } );
        })
    });

    describe('DELETE /games/:id', () => {

        it('should return 204 when game is deleted', async () => {
            vi.spyOn(connection, 'query').mockImplementationOnce((sql, params, callback) => {
                callback(null, { affectedRows: 1 })
            });

            const response = await request(app).delete('/games/4');

            expect(response.status).toBe(204);
            expect(response.text).toBe('');
        });

        it('should return 400 for invalid id', async () => {

            const response = await request(app).delete('/games/id');

            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'Invalid game id' } );
        });

        it('should return 404 when game does not exist', async () => {
            vi.spyOn(connection, 'query').mockImplementationOnce((sql, params, callback) => {
                callback(null, { affectedRows: 0 })
            });

            const response = await request(app).delete('/games/9999999');

            expect(response.status).toBe(404);
            expect(response.body).toEqual( { error: 'Game not found' } );
        });
    });

    describe('PUT /games/:id', () => {

        it('shoud update a game', async () => {
            vi.spyOn(connection, 'query')
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, { affectedRows: 1 })
                })
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [
                        {
                            id: 1,
                            name: 'Super Mario Updated',
                            developer: 'Nintendo',
                            category_id: 1,
                            category_name: 'arcade'
                        }
                    ])
                });

            const response = await request(app)
                .put('/games/1')
                .send({
                    name: 'Super Mario Updated',
                    developer: 'Nintendo',
                    category_id: 1
                })
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'Super Mario Updated',
                developer: 'Nintendo',
                category_id: 1,
                category_name: 'arcade'
            });
        });

        it('should return 404 when game does not exist', async () => {
            vi.spyOn(connection, 'query').mockImplementationOnce((sql, params, callback) => {
                callback(null, { affectedRows: 0 })
            });

            const response = await request(app)
                .put('/games/999999')
                .send({
                    name: 'Phasmophobia',
                    developer: 'Kinetic Games',
                    category_id: 2
                });
            
            expect(response.status).toBe(404);
            expect(response.body).toEqual( { error: 'Game not found' } );
        });

        it('should return 400 for invalid id', async () => {

            const response = await request(app)
                .put('/games/id')
                .send({
                    name: 'Phasmophobia',
                    developer: 'Kinetic Games',
                    category_id: 2
                });
            
            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'Invalid game id' } );
        });
    });

    describe('PATCH /games/:id', () => {

        it('should partially update a game', async () => {

            vi.spyOn(connection, 'query')
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [
                        {
                            id: 1,
                            name: 'Super Mario',
                            developer: null,
                            category_id: 1
                        }
                    ])
                })
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, { affectedRows: 1 })
                })
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [
                        {
                            id: 1,
                            name: 'Super Mario',
                            developer: 'Nintendo',
                            category_id: 1,
                            category_name: 'arcade'
                        }
                    ])
                });

            const response = await request(app)
                .patch('/games/1')
                .send( { developer: 'Nintendo' } );
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 1,
                name: 'Super Mario',
                developer: 'Nintendo',
                category_id: 1,
                category_name: 'arcade'   
            });
        });

        it('should return 400 when no fields are provided', async () => {
            const response = await request(app)
                .patch('/games/1')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'At least one field is required' } );
        });

        it('should return 400 for invalid id', async () => {
            const response = await request(app)
                .patch('/games/id')
                .send( { developer: 'Nintendo' } );

            expect(response.status).toBe(400);
            expect(response.body).toEqual( { error: 'Invalid game id' } );
        });

        it('should return 404 when game does not exist', async () =>{
            vi.spyOn(connection, 'query').mockImplementationOnce((sql, params, callback) => {
                callback(null, [])
            });

            const response = await request(app)
                .patch('/games/999999')
                .send( { developer: 'Nintendo' } );

            expect(response.status).toBe(404);
            expect(response.body).toEqual( { error: 'Game not found' } );
        });
    });

});