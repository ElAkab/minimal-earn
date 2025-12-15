import express from "express";
import * as dataStore from "../lib/dataStore.js";
import * as scheduler from "../lib/scheduler.js";
import * as ai from "../lib/ai.js";

const router = express.Router();

router.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

// Create / update note with scheduling metadata
router.post("/generate-note", async (req, res) => {
	try {
		const { aiTags, title, description, intensity } = req.body;

		const note = {
			id: Date.now(),
			aiTags: aiTags || [],
			title: title || "",
			description: description || "",
			intensity: intensity || "moderate",
			createdAt: new Date().toISOString(),
			reviewCount: 0,
			lastReviewed: null,
			lastInterval: scheduler.baseIntervalForIntensity(intensity || "moderate"),
			nextReviewAt: new Date(
				Date.now() + scheduler.baseIntervalForIntensity(intensity || "moderate")
			).toISOString(),
		};

		const notes = await dataStore.readNotes();
		notes.push(note);
		await dataStore.writeNotes(notes);

		console.log("Saved note:", note);
		res.status(200).json({ message: "Note saved successfully", note });
	} catch (error) {
		console.error("Error saving note:", error);
		res.status(500).json({ message: "Failed to save note" });
	}
});

// List all notes
router.get("/notes", async (req, res) => {
	try {
		const notes = await dataStore.readNotes();
		res.json({ notes });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to read notes" });
	}
});

// Return notes due for review (respect config flag)
// Censé être appelé après vérification du toggle côté client
router.get("/due-notes", async (req, res) => {
	try {
		const cfg = await dataStore.readConfig();
		if (!cfg.interrogationsEnabled)
			return res.json({ enabled: false, due: [] });

		const notes = await dataStore.readNotes();
		const now = new Date();
		const due = notes.filter((n) => {
			if (!n.nextReviewAt) return true;
			return new Date(n.nextReviewAt) <= now;
		});
		res.json({ enabled: true, due });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to get due notes" });
	}
});

// Obselete : Get prompt for a specific note
// router.get("/prompt/:id", async (req, res) => {
// 	try {
// 		const id = Number(req.params.id);
// 		const notes = await dataStore.readNotes();
// 		const note = notes.find((n) => n.id === id);
// 		if (!note) return res.status(404).json({ message: "Note not found" });
// 		const prompt = ai.buildPrompt(note);
// 		res.json({ prompt, ai: ai.pickIA(note.aiTags) });
// 	} catch (err) {
// 		console.error(err);
// 		res.status(500).json({ message: "Failed to build prompt" });
// 	}
// });

// Censé être appelé pour générer une question pour une note spécifique via IA
router.get("/generate-question/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		console.log(`📝 Requête génération question pour note ID: ${id}`);

		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === id);

		if (!note) {
			console.error(`❌ Note ${id} introuvable`);
			return res.status(404).json({ message: "Note not found" });
		}

		console.log(`📄 Note trouvée:`, {
			id: note.id,
			title: note.title,
			descriptionLength: note.description?.length || 0,
		});

		// Générer la question via IA
		const question = await ai.generateQuestion(note);
		const model = ai.pickModel(note);

		console.log(`✅ Question générée avec succès pour note ${id}`);
		res.json({ question, model });
	} catch (err) {
		console.error("❌ Erreur génération question:", err);
		console.error("Stack trace:", err.stack);
		res.status(500).json({
			message: "Failed to generate question",
			error: err.message,
		});
	}
});

// Evaluate user's answer using AI
router.post("/evaluate-answer", async (req, res) => {
	try {
		const { noteId, question, userAnswer } = req.body;

		console.log(`📝 Requête évaluation pour note ID: ${noteId}`);

		if (!userAnswer || userAnswer.trim() === "") {
			console.warn(`⚠️ Réponse vide reçue pour note ${noteId}`);
			return res.status(400).json({ message: "Answer is required" });
		}

		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === Number(noteId));

		if (!note) {
			console.error(`❌ Note ${noteId} introuvable`);
			return res.status(404).json({ message: "Note not found" });
		}

		console.log(`🤖 Évaluation en cours pour note ${noteId}...`);

		// Évaluer la réponse via IA
		const evaluation = await ai.evaluateAnswer(
			question,
			userAnswer,
			note.description
		);

		console.log(`✅ Évaluation terminée pour note ${noteId}:`, {
			isCorrect: evaluation.isCorrect,
		});

		res.json(evaluation);
	} catch (err) {
		console.error("❌ Erreur évaluation réponse:", err);
		console.error("Stack trace:", err.stack);
		res.status(500).json({
			message: "Failed to evaluate answer",
			error: err.message,
		});
	}
});

// Generate a hint for a specific note
router.get("/hint/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		console.log(`💡 Requête génération indice pour note ID: ${id}`);

		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === id);

		if (!note) {
			console.error(`❌ Note ${id} introuvable`);
			return res.status(404).json({ message: "Note not found" });
		}

		// Générer un indice via IA
		const hint = await ai.generateHint(note);

		console.log(`✅ Indice généré avec succès pour note ${id}`);
		res.json({ hint });
	} catch (err) {
		console.error("❌ Erreur génération indice:", err);
		console.error("Stack trace:", err.stack);
		res.status(500).json({
			message: "Failed to generate hint",
			error: err.message,
		});
	}
});

// Record a review result and adapt schedule
router.post("/review-note", async (req, res) => {
	try {
		const { id, correct } = req.body;
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === Number(id));
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		const note = notes[idx];
		const update = scheduler.computeNextReview(note, !!correct);
		note.lastReviewed = update.lastReviewed;
		note.lastInterval = update.lastInterval;
		note.nextReviewAt = update.nextReviewAt;
		note.reviewCount = update.reviewCount;

		notes[idx] = note;
		await dataStore.writeNotes(notes);

		res.json({ message: "Review recorded", note });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to record review" });
	}
});

// Get / set config (toggle interrogations)
router.get("/config", async (req, res) => {
	try {
		console.log("📡 GET /config - Lecture de la configuration");
		const cfg = await dataStore.readConfig();
		console.log("✅ Configuration chargée:", cfg);
		res.json(cfg);
	} catch (err) {
		console.error("❌ Erreur lors de la lecture de la config:", err);
		// Retourner une config par défaut en cas d'erreur
		res.status(500).json({
			message: "Failed to read config",
			error: err.message,
			fallback: { interrogationsEnabled: true },
		});
	}
});

router.post("/config", async (req, res) => {
	try {
		console.log("📡 POST /config - Mise à jour de la configuration");
		console.log("📥 Body reçu:", req.body);

		const incoming = req.body || {};

		// Whitelist of allowed config properties
		const allowedProps = ["interrogationsEnabled"];
		const filtered = {};

		for (const key of allowedProps) {
			if (Object.prototype.hasOwnProperty.call(incoming, key)) {
				// Validation du type pour interrogationsEnabled
				if (
					key === "interrogationsEnabled" &&
					typeof incoming[key] !== "boolean"
				) {
					return res.status(400).json({
						message: "interrogationsEnabled must be a boolean",
					});
				}
				filtered[key] = incoming[key];
			}
		}

		// Si aucune propriété valide n'a été fournie
		if (Object.keys(filtered).length === 0) {
			return res.status(400).json({
				message: "No valid config properties provided",
			});
		}

		// Charger la config existante et fusionner
		const existingConfig = await dataStore.readConfig();
		const cfg = Object.assign(existingConfig, filtered);

		await dataStore.writeConfig(cfg);
		console.log("✅ Configuration mise à jour:", cfg);

		res.json(cfg);
	} catch (err) {
		console.error("❌ Erreur lors de l'écriture de la config:", err);
		res.status(500).json({
			message: "Failed to write config",
			error: err.message,
		});
	}
});

// Simulate schedule without persisting (secure test of algorithm)
router.post("/simulate-schedule", async (req, res) => {
	try {
		const { id, correct } = req.body;
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === Number(id));
		if (!note) return res.status(404).json({ message: "Note not found" });
		const simulated = scheduler.computeNextReview(note, !!correct);
		res.json({ simulated });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Simulation failed" });
	}
});

// Delete a note by ID
router.delete("/notes/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === id);
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		notes.splice(idx, 1);
		await dataStore.writeNotes(notes);

		res.json({ message: "Note deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to delete note" });
	}
});

// Update a note by ID
router.put("/notes/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const { title, description, intensity, aiTags } = req.body;
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === id);
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		const note = notes[idx];
		// Update only provided fields
		if (title !== undefined) note.title = title;
		if (description !== undefined) note.description = description;
		if (aiTags !== undefined) note.aiTags = aiTags;
		if (intensity !== undefined) {
			note.intensity = intensity;
			// Recalculate scheduling if intensity changed
			note.lastInterval = scheduler.baseIntervalForIntensity(intensity);
			note.nextReviewAt = new Date(
				Date.now() + note.lastInterval
			).toISOString();
		}

		notes[idx] = note;
		await dataStore.writeNotes(notes);

		res.json({ message: "Note updated successfully", note });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to update note" });
	}
});

export default router;
