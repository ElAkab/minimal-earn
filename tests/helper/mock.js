import Database from "better-sqlite3";

/**
 * Crée une base de données de test en mémoire
 * Utilise ':memory:' pour ne pas polluer la vraie base de données
 */
export function createTestDatabase() {
	// :memory: pour une base de données temporaire en RAM. Parfait pour les tests.
	const db = new Database(":memory:");

	// Activer les clés étrangères de FOREIGN KEY (important pour la cohérence des données)
	db.pragma("foreign_keys = ON");

	// .exec() : exécute une commande SQL directement. Ici c'est pour créer les tables. Mais ça peut être utilisé pour n'importe quelle commande SQL (ex: INSERT, UPDATE, DELETE, etc.).

	db.exec(`
        CREATE TABLE IF NOT EXISTS Notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            intensity INTEGER NOT NULL,  -- ✅ Nombre (1, 2, 3)
            color TEXT,
            nextReviewDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            easeFactor REAL DEFAULT 2.5,
            currentInterval INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS Progression (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            responseScore INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE
        );
    `);

	return db;
}

/**
 * Crée une note de test avec des valeurs par défaut
 */
export function createNote(db, overrides = {}) {
	const defaults = {
		title: "Test Note",
		content: "Test Content",
		intensity: 1, // Par défaut : Chill
		color: "blue",
		nextReviewDate: new Date().toISOString(),
		easeFactor: 2.5,
		currentInterval: 0,
	};

	const note = { ...defaults, ...overrides };

	const stmt = db.prepare(`
        INSERT INTO Notes (title, content, intensity, color, nextReviewDate, easeFactor, currentInterval)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

	const result = stmt.run(
		note.title,
		note.content,
		note.intensity,
		note.color,
		note.nextReviewDate,
		note.easeFactor,
		note.currentInterval
	);

	return result.lastInsertRowid;
}

/**
 * Retourne une date ISO avec un offset en jours
 */
export function getDateOffset(days) {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString();
}
// Exemple d'utilisation : getDateOffset(3) pour 3 jours dans le futur

/**
 * Enregistre une révision dans l'historique
 */
export function recordReview(db, noteId, score) {
	const stmt = db.prepare(`
        INSERT INTO Progression (note_id, responseScore)
        VALUES (?, ?)
    `);

	return stmt.run(noteId, score);
}
// Exemple d'utilisation : recordReview(db, noteId, 4) pour enregistrer une révision avec un score de 4
