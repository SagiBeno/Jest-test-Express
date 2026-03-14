const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

const connection = mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'games',
	port: Number(process.env.DB_PORT) || 3306
});

app.use(cors());
app.use(express.json());

function runQuery(sql, params, callback) {
	connection.query(sql, params, callback);
}

function fetchGameById(id, callback) {
	runQuery(
		`SELECT g.id, g.name, g.developer, g.category_id, c.name AS category_name
		 FROM games g
		 LEFT JOIN categories c ON g.category_id = c.id
		 WHERE g.id = ?`,
		[id],
		(error, rows) => {
			if (error) {
				return callback(error);
			}
			return callback(null, rows[0] || null);
		}
	);
}

function handleDbError(res, fallbackMessage, error) {
	if (error.code === 'ER_NO_REFERENCED_ROW_2') {
		return res.status(400).json({ error: 'category_id does not exist' });
	}
	return res.status(500).json({ error: fallbackMessage, details: error.message });
}

function validateGamePayload(body, requireAllFields = true) {
	const { name, developer, category_id } = body;

	if (requireAllFields && (name === undefined || category_id === undefined)) {
		return 'name and category_id are required';
	}

	if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
		return 'name must be a non-empty string';
	}

	if (developer !== undefined && developer !== null && typeof developer !== 'string') {
		return 'developer must be a string or null';
	}

	if (category_id !== undefined && category_id !== null && !Number.isInteger(category_id)) {
		return 'category_id must be an integer or null';
	}

	return null;
}

app.get('/health', (_req, res) => {
	res.status(200).json({ ok: true });
});

app.get('/games', (_req, res) => {
	runQuery(
		`SELECT g.id, g.name, g.developer, g.category_id, c.name AS category_name
		 FROM games g
		 LEFT JOIN categories c ON g.category_id = c.id
		 ORDER BY g.id ASC`,
		[],
		(error, rows) => {
			if (error) {
				return res.status(500).json({ error: 'Failed to fetch games', details: error.message });
			}
			return res.json(rows);
		}
	);
});

app.get('/games/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		return res.status(400).json({ error: 'Invalid game id' });
	}

	fetchGameById(id, (error, game) => {
		if (error) {
			return res.status(500).json({ error: 'Failed to fetch game', details: error.message });
		}

		if (!game) {
			return res.status(404).json({ error: 'Game not found' });
		}

		return res.json(game);
	});
});

app.post('/games', (req, res) => {
	const validationError = validateGamePayload(req.body, true);
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}

	const { name, developer = null, category_id } = req.body;

	runQuery(
		'INSERT INTO games (name, developer, category_id) VALUES (?, ?, ?)',
		[name.trim(), developer, category_id],
		(insertError, result) => {
			if (insertError) {
				return handleDbError(res, 'Failed to create game', insertError);
			}

			fetchGameById(result.insertId, (fetchError, game) => {
				if (fetchError) {
					return res.status(500).json({ error: 'Failed to fetch created game', details: fetchError.message });
				}
				return res.status(201).json(game);
			});
		}
	);
});

app.put('/games/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		return res.status(400).json({ error: 'Invalid game id' });
	}

	const validationError = validateGamePayload(req.body, true);
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}

	const { name, developer = null, category_id } = req.body;

	runQuery(
		'UPDATE games SET name = ?, developer = ?, category_id = ? WHERE id = ?',
		[name.trim(), developer, category_id, id],
		(updateError, result) => {
			if (updateError) {
				return handleDbError(res, 'Failed to update game', updateError);
			}

			if (result.affectedRows === 0) {
				return res.status(404).json({ error: 'Game not found' });
			}

			fetchGameById(id, (fetchError, game) => {
				if (fetchError) {
					return res.status(500).json({ error: 'Failed to fetch updated game', details: fetchError.message });
				}
				return res.json(game);
			});
		}
	);
});

app.patch('/games/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		return res.status(400).json({ error: 'Invalid game id' });
	}

	const { name, developer, category_id } = req.body;
	if (name === undefined && developer === undefined && category_id === undefined) {
		return res.status(400).json({ error: 'At least one field is required' });
	}

	const validationError = validateGamePayload(req.body, false);
	if (validationError) {
		return res.status(400).json({ error: validationError });
	}

	runQuery('SELECT * FROM games WHERE id = ?', [id], (existingError, existingRows) => {
		if (existingError) {
			return res.status(500).json({ error: 'Failed to fetch game', details: existingError.message });
		}

		if (existingRows.length === 0) {
			return res.status(404).json({ error: 'Game not found' });
		}

		const existing = existingRows[0];
		const nextName = name !== undefined ? name.trim() : existing.name;
		const nextDeveloper = developer !== undefined ? developer : existing.developer;
		const nextCategoryId = category_id !== undefined ? category_id : existing.category_id;

		runQuery(
			'UPDATE games SET name = ?, developer = ?, category_id = ? WHERE id = ?',
			[nextName, nextDeveloper, nextCategoryId, id],
			(updateError) => {
				if (updateError) {
					return handleDbError(res, 'Failed to patch game', updateError);
				}

				fetchGameById(id, (fetchError, game) => {
					if (fetchError) {
						return res.status(500).json({ error: 'Failed to fetch patched game', details: fetchError.message });
					}
					return res.json(game);
				});
			}
		);
	});
});

app.delete('/games/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		return res.status(400).json({ error: 'Invalid game id' });
	}

	runQuery('DELETE FROM games WHERE id = ?', [id], (error, result) => {
		if (error) {
			return res.status(500).json({ error: 'Failed to delete game', details: error.message });
		}

		if (result.affectedRows === 0) {
			return res.status(404).json({ error: 'Game not found' });
		}

		return res.status(204).send();
	});
});

app.get('/categories', (_req, res) => {
	runQuery('SELECT id, name FROM categories ORDER BY id ASC', [], (error, rows) => {
		if (error) {
			return res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
		}
		return res.json(rows);
	});
});

app.use((req, res) => {
	res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

function startServer() {
	connection.connect((error) => {
		if (error) {
			// eslint-disable-next-line no-console
			console.error('Database connection failed:', error.message);
			process.exit(1);
		}

		app.listen(PORT, () => {
			// eslint-disable-next-line no-console
			console.log(`API running at http://localhost:${PORT}`);
		});
	});
}

if (require.main === module) {
	startServer();
}

module.exports = { app, startServer, connection };
