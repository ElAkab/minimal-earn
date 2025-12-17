import express from "express";
import db from "../../src/db.js";
import { calculateNextReview } from "../../src/core/scheduler.js";

const router = express.Router();

/**
 * POST /api/notes - Créer une nouvelle note
 */
router.post("/notes", (req, res) => {
	const { title, content, intensity, color } = req.body;

	console.log("Received payload:", req.body);

	// Validation simple : vérifier que le titre existe
	if (!title || title.trim() === "") {
		return res.status(400).json({ error: "Le titre est requis" });
	}

	const initialEaseFactor = 2.5;
	const initialInterval = 0;
	const { interval } = calculateNextReview(
		0,
		initialInterval,
		initialEaseFactor
	); // Récupérer l'intervalle initial (1 jour)
	const nextReviewDate = addDays(new Date(), interval); // Calculer la date de révision

	// Utilité pour calculer la date future (en jours)
	function addDays(date, days) {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result.toISOString(); // Format standard ISO pour SQLite DATETIME
	}

	try {
		// Préparer l'insertion de la note dans la base de données
		const stmt = db.prepare(`
			INSERT INTO Notes (title, content, intensity, color, easeFactor, currentInterval, nextReviewDate)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		// Exécuter l'insertion et récupérer l'ID de la note créée
		const result = stmt.run(
			title,
			content,
			intensity,
			color,
			initialEaseFactor,
			interval, // on stocke 1 pour le currentInterval
			nextReviewDate // <-- La date calculée
		);

		console.log(`✅ Note créée avec l'ID: ${result.lastInsertRowid}`);

		// Retourner la note créée avec son ID
		res.status(201).json({
			message: "Note créée avec succès",
			note: {
				id: result.lastInsertRowid, // L'ID généré automatiquement
				title,
				content,
				intensity,
				color,
			},
		});
	} catch (error) {
		console.error("❌ Erreur lors de la création de la note:", error);
		res
			.status(500)
			.json({ error: "Erreur serveur lors de la création de la note" });
	}
});

/**
 * DELETE /api/notes/:id - Supprimer une note spécifique
 */
router.delete("/notes/:id", (req, res) => {
	try {
		const { id } = req.params;
		const stmt = db.prepare("DELETE FROM Notes WHERE id = ?");
		const result = stmt.run(id);

		if (result.changes === 0) {
			return res.status(404).json({ error: "Note introuvable" });
		}

		console.log(`🗑️ Note ${id} supprimée`);
		res.json({ message: "Note supprimée avec succès" });
	} catch (error) {
		console.error("❌ Erreur suppression note:", error);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * DELETE /api/notes - Supprimer toutes les notes
 */
router.delete("/notes", (req, res) => {
	try {
		const stmt = db.prepare("DELETE FROM Notes");
		const result = stmt.run();

		console.log(`🗑️ ${result.changes} notes supprimées.`);

		res.json({ message: `${result.changes} notes supprimées.` });
	} catch (error) {
		console.error("❌ Erreur lors de la suppression des notes:", error);
		res
			.status(500)
			.json({ error: "Erreur serveur lors de la suppression des notes" });
	}
});

/**
 * GET /api/notes/review - Récupérer les notes à réviser selon l'intensité
 */
router.get("/notes/review", (req, res) => {
	try {
		const intensity = parseInt(req.query.intensity, 10) || 2;
		const now = new Date().toISOString();

		const stmt = db.prepare(`
			SELECT 
				id, title, content, intensity, color,
				nextReviewDate, easeFactor, currentInterval
			FROM Notes
			WHERE intensity = ? AND nextReviewDate <= ?
			ORDER BY nextReviewDate ASC
		`);

		const notes = stmt.all(intensity, now);

		console.log(`📚 ${notes.length} notes à réviser (intensité ${intensity})`);
		res.json({ count: notes.length, notes });
	} catch (error) {
		console.error("❌ Erreur récupération notes à réviser:", error);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * GET /api/notes - Récupérer toutes les notes (triées par prochaine révision)
 */
router.get("/notes", (req, res) => {
	try {
		// Préparer la requête SQL
		const stmt = db.prepare(`
            SELECT 
                id,
                title, 
                content,
                intensity,
                color,
                nextReviewDate,
                easeFactor,
                currentInterval,
                created_at
            FROM Notes 
            ORDER BY nextReviewDate ASC 
            LIMIT 10
        `);

		// Exécuter la requête et récupérer toutes les lignes
		const notes = stmt.all();

		// Retourner les données
		res.json({
			count: notes.length,
			notes: notes,
		});
	} catch (error) {
		console.error("❌ Erreur lors de la récupération des notes:", error);
		res.status(500).json({
			error: "Erreur serveur lors de la récupération des notes",
		});
	}
});

/**
 * GET /api/create-test-notes - Créer des notes de test avec dates de révision passées
 */
router.get("/create-test-notes", (req, res) => {
	try {
		const testNotes = [
			{
				title: "Capitale France",
				content: "Quelle est la capitale de la France ?",
				intensity: 2,
				color: "amber",
			},
			{
				title: "Théorème de Pythagore",
				content: "Quelle est la formule du théorème de Pythagore ?",
				intensity: 2,
				color: "blue",
			},
			{
				title: "JavaScript Closure",
				content: "Qu'est-ce qu'une closure en JavaScript ?",
				intensity: 2,
				color: "amber",
			},
		];

		const stmt = db.prepare(`
			INSERT INTO Notes (title, content, intensity, color, easeFactor, currentInterval, nextReviewDate)
			VALUES (?, ?, ?, ?, 2.5, 1, ?)
		`);

		// Date passée (il y a 2 jours)
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 2);
		const pastDateISO = pastDate.toISOString();

		testNotes.forEach((note) => {
			stmt.run(
				note.title,
				note.content,
				note.intensity,
				note.color,
				pastDateISO
			);
		});

		console.log(`✅ ${testNotes.length} notes de test créées`);
		res.json({
			message: `${testNotes.length} notes de test créées`,
			notes: testNotes,
		});
	} catch (error) {
		console.error("❌ Erreur création notes de test:", error);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * POST /api/reset-ids - Réinitialise les IDs auto-incrémentés
 */
router.post("/reset-ids", (req, res) => {
	try {
		// Supprimer toutes les notes
		db.prepare("DELETE FROM Notes").run();

		// Réinitialiser la séquence auto-increment
		db.prepare("DELETE FROM sqlite_sequence WHERE name='Notes'").run();

		console.log("🔄 IDs réinitialisés");
		res.json({ message: "IDs réinitialisés, base vide" });
	} catch (error) {
		console.error("❌ Erreur reset IDs:", error);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

export default router;
