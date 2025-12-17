import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "../src/db.js";
import { getNoteToReview } from "../src/core/scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier "pages" directement à la racine
// Cela permet d'accéder aux fichiers sans le préfixe "/pages/"
app.use(express.static(path.join(__dirname, "..", "pages")));

// Routes
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/notes", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "pages", "notes.html"));
});

app.post("/api/notes", (req, res) => {
	const { title, content, intensity, color } = req.body;

	console.log("Received payload:", req.body);

	// Validation simple : vérifier que le titre existe
	if (!title || title.trim() === "") {
		return res.status(400).json({ error: "Le titre est requis" });
	}

	const initialEaseFactor = 2.5;
	const initialInterval = 0;

	try {
		// Préparer l'insertion de la note dans la base de données
		const stmt = db.prepare(`
			INSERT INTO Notes (title, content, intensity, color, easeFactor, currentInterval)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		// Exécuter l'insertion et récupérer l'ID de la note créée
		const result = stmt.run(
			title,
			content,
			intensity,
			color,
			initialEaseFactor,
			initialInterval
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

// GET : Récupérer toutes les notes (triées par prochaine révision)
app.get("/api/notes", (req, res) => {
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

// Récupérer les notes à réviser
app.get("/api/notes/review", (req, res) => {
	// 1. On récupère la query 'intensity' (un objet) depuis les paramètres de la requête
	const { intensity } = req.query;

	// 2. On vérifie que l'intensity est bien fournie
	if (!intensity) {
		return res.status(404).json({ message: "Aucune intensité fournie" });
	}

	// Utiliser un try/catch pour gérer les erreurs potentielles (ex: problème de base de données)
	try {
		// 3. On récupère le tableau de notes à réviser
		const notes = getNoteToReview(intensity); // Erreur possible ici si l'intensity n'est pas gérée

		// 4. On renvoie un JSON qui contiendra le nombre de notes ainsi que les notes elles-mêmes
		res.json({
			count: notes.length,
			notes: notes,
		});
	} catch (err) {
		console.error("Erreur lors de la récupération de notes :", err);
		res
			.status(500)
			.json({ message: "Erreur serveur lors de la récupération des notes" });
	}
});

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
