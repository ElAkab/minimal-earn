import express from "express";
import * as dataStore from "../lib/dataStore.js";
import * as sessionScheduler from "../lib/sessionScheduler.js";
import * as ai from "../lib/ai.js";
import * as questionCache from "../lib/questionCache.js";
import * as preGenerator from "../lib/preGenerator.js";

const router = express.Router();

router.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

// Create note with minimal metadata (session-based approach)
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

// Get current active session and priority note
// Retourne la note prioritaire si une session est active
router.get("/current-session", async (req, res) => {
	try {
		const cfg = await dataStore.readConfig();
		if (!cfg.interrogationsEnabled) {
			return res.json({
				enabled: false,
				sessionActive: false,
				priorityNote: null,
			});
		}

		const notes = await dataStore.readNotes();

		// Vérifier chaque intensité pour une session active
		const intensities = ["chill", "moderate", "intensive"];
		let priorityNote = null;
		let activeIntensity = null;
		let questionCached = false;

		for (const intensity of intensities) {
			if (sessionScheduler.isSessionActive(intensity)) {
				const sessionNotes = sessionScheduler.getSessionNotes(
					notes,
					intensity,
					1
				);
				if (sessionNotes.length > 0) {
					priorityNote = sessionNotes[0];
					activeIntensity = intensity;

					// Vérifier si la question est en cache
					const cached = await questionCache.getCachedQuestion(priorityNote.id);
					questionCached = !!cached;

					break;
				}
			}
		}

		// Déclencher la pré-génération en arrière-plan si nécessaire
		// (uniquement si des sessions sont proches et n'ont pas de questions en cache)
		const upcomingSessions = sessionScheduler.getAllUpcomingSessions(
			notes,
			2 * 60 * 60 * 1000
		); // 2h lookahead
		if (upcomingSessions.length > 0 && upcomingSessions[0].withinLookahead) {
			// Déclencher pré-génération asynchrone sans bloquer la réponse
			preGenerator
				.preGenerateForUpcomingSessions({
					intensities: [upcomingSessions[0].intensity],
					maxQuestions: 5,
				})
				.catch((err) => {
					console.error("❌ Erreur pré-génération automatique:", err);
				});
		}

		res.json({
			enabled: true,
			sessionActive: !!priorityNote,
			activeIntensity,
			priorityNote,
			questionCached,
			nextSessions: {
				chill: sessionScheduler.getNextSessionTime("chill"),
				moderate: sessionScheduler.getNextSessionTime("moderate"),
				intensive: sessionScheduler.getNextSessionTime("intensive"),
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to get current session" });
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

		// Vérifier si une question est en cache
		const cached = await questionCache.getCachedQuestion(id);
		if (cached) {
			questionCache.recordCacheHit();
			console.log(
				`🎯 Question trouvée en cache pour note ${id} (modèle: ${cached.model})`
			);
			return res.json({
				question: cached.question,
				model: cached.model,
				cached: true,
				generatedAt: cached.generatedAt,
			});
		}

		// Générer la question via IA si pas en cache
		questionCache.recordCacheMiss();
		console.log(`🤖 Génération d'une nouvelle question pour note ${id}...`);
		const { question, model } = await ai.generateQuestion(note);
		questionCache.recordGeneration();

		// Mettre en cache la question générée avec le modèle réel utilisé
		await questionCache.cacheQuestion(id, question, model);

		// Nettoyer le cache de manière asynchrone (sans bloquer la réponse)
		questionCache.cleanExpiredCache().catch((err) => {
			console.error("❌ Erreur nettoyage cache asynchrone:", err);
		});

		console.log(
			`✅ Question générée avec succès pour note ${id} (modèle: ${model})`
		);
		res.json({
			question,
			model,
			cached: false,
		});
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

// Record a review result (simplified - no complex scheduling)
router.post("/review-note", async (req, res) => {
	try {
		const { id, correct } = req.body;
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === Number(id));
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		const note = notes[idx];
		const update = sessionScheduler.recordReview(note, !!correct);

		note.lastReviewed = update.lastReviewed;
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

// Get session configuration (for future Settings page)
router.get("/session-config", async (req, res) => {
	try {
		const config = sessionScheduler.getSessionConfig();
		res.json(config);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to get session config" });
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

		// Invalider le cache de la question pour cette note
		await questionCache.invalidateCache(id);

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
		}

		notes[idx] = note;
		await dataStore.writeNotes(notes);

		// Invalider le cache si le contenu a changé (car la question pourrait être différente)
		if (title !== undefined || description !== undefined) {
			await questionCache.invalidateCache(id);
			console.log(`🗑️ Cache invalidé pour note ${id} après modification`);
		}

		res.json({ message: "Note updated successfully", note });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to update note" });
	}
});

// =====================
// Endpoints de gestion du cache de questions
// =====================

// Invalider le cache pour une note spécifique
router.delete("/question-cache/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const invalidated = await questionCache.invalidateCache(id);

		if (invalidated) {
			res.json({ message: `Cache invalidé pour note ${id}` });
		} else {
			res.json({ message: `Aucun cache trouvé pour note ${id}` });
		}
	} catch (err) {
		console.error("❌ Erreur invalidation cache:", err);
		res.status(500).json({ message: "Failed to invalidate cache" });
	}
});

// Nettoyer toutes les entrées de cache expirées
router.post("/question-cache/clean", async (req, res) => {
	try {
		const removedCount = await questionCache.cleanExpiredCache();
		res.json({
			message: `${removedCount} entrée(s) de cache expirée(s) supprimée(s)`,
			removedCount,
		});
	} catch (err) {
		console.error("❌ Erreur nettoyage cache:", err);
		res.status(500).json({ message: "Failed to clean cache" });
	}
});

// Obtenir les statistiques du cache
router.get("/question-cache/stats", async (req, res) => {
	try {
		const stats = await questionCache.getCacheStats();
		res.json(stats);
	} catch (err) {
		console.error("❌ Erreur récupération stats cache:", err);
		res.status(500).json({ message: "Failed to get cache stats" });
	}
});

// =====================
// Endpoints de pré-génération
// =====================

// Déclencher la pré-génération manuelle des questions
router.post("/pre-generate", async (req, res) => {
	try {
		console.log("🚀 [API] Déclenchement manuel de la pré-génération");

		// Options optionnelles depuis le body
		const options = {
			intensities: req.body.intensities, // Array<string> optionnel
			maxQuestions: req.body.maxQuestions, // number optionnel
		};

		// Lancer la pré-génération
		const report = await preGenerator.preGenerateForUpcomingSessions(options);

		// Retourner le rapport détaillé
		res.json({
			message: "Pré-génération terminée",
			report,
		});
	} catch (err) {
		console.error("❌ [API] Erreur pré-génération:", err);
		res.status(500).json({
			message: "Failed to pre-generate questions",
			error: err.message,
		});
	}
});

// Obtenir la configuration du pré-générateur
router.get("/pre-generate/config", (req, res) => {
	try {
		const config = preGenerator.getPreGeneratorConfig();
		res.json(config);
	} catch (err) {
		console.error("❌ [API] Erreur récupération config pré-générateur:", err);
		res.status(500).json({ message: "Failed to get pre-generator config" });
	}
});

// Mettre à jour la configuration du pré-générateur
router.put("/pre-generate/config", (req, res) => {
	try {
		preGenerator.updatePreGeneratorConfig(req.body);
		const updatedConfig = preGenerator.getPreGeneratorConfig();
		res.json({
			message: "Configuration mise à jour",
			config: updatedConfig,
		});
	} catch (err) {
		console.error("❌ [API] Erreur mise à jour config pré-générateur:", err);
		res.status(500).json({ message: "Failed to update pre-generator config" });
	}
});

// =====================
// Endpoints sessions à venir
// =====================

/**
 * GET /api/upcoming-sessions
 * Récupère les sessions à venir dans une fenêtre temporelle donnée
 * Query params:
 * - lookahead: durée d'anticipation en heures (défaut: 24h)
 */
router.get("/upcoming-sessions", async (req, res) => {
	try {
		const lookaheadHours = parseInt(req.query.lookahead) || 24;
		const lookaheadMs = lookaheadHours * 60 * 60 * 1000;

		console.log(
			`📅 Récupération sessions à venir (lookahead: ${lookaheadHours}h)`
		);

		const notes = await dataStore.readNotes();
		const upcomingSessions = sessionScheduler.getAllUpcomingSessions(
			notes,
			lookaheadMs
		);

		// Enrichir avec info de cache pour chaque session
		const enrichedSessions = await Promise.all(
			upcomingSessions.map(async (session) => {
				const notesWithCache = await Promise.all(
					session.notes.map(async (note) => {
						const cached = await questionCache.getCachedQuestion(note.id);
						return {
							...note,
							questionCached: !!cached,
						};
					})
				);

				const cachedCount = notesWithCache.filter(
					(n) => n.questionCached
				).length;

				return {
					...session,
					notes: notesWithCache,
					cacheStatus: {
						total: notesWithCache.length,
						cached: cachedCount,
						missing: notesWithCache.length - cachedCount,
						percentage:
							notesWithCache.length > 0
								? ((cachedCount / notesWithCache.length) * 100).toFixed(2)
								: "0.00",
					},
				};
			})
		);

		res.json({
			lookaheadHours,
			sessions: enrichedSessions,
			totalSessions: enrichedSessions.length,
		});
	} catch (err) {
		console.error("❌ [API] Erreur récupération sessions à venir:", err);
		res.status(500).json({
			message: "Failed to get upcoming sessions",
			error: err.message,
		});
	}
});

// =====================
// Endpoints métriques de cache
// =====================

/**
 * GET /api/cache-metrics
 * Récupère les métriques de cache (hit/miss, statistiques)
 */
router.get("/cache-metrics", async (req, res) => {
	try {
		const metrics = questionCache.getCacheMetrics();
		const stats = await questionCache.getCacheStats();

		res.json({
			metrics,
			stats,
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		console.error("❌ [API] Erreur récupération métriques cache:", err);
		res.status(500).json({
			message: "Failed to get cache metrics",
			error: err.message,
		});
	}
});

/**
 * POST /api/cache-metrics/reset
 * Réinitialise les métriques de cache hit/miss
 */
router.post("/cache-metrics/reset", (req, res) => {
	try {
		questionCache.resetCacheMetrics();
		const metrics = questionCache.getCacheMetrics();

		res.json({
			message: "Métriques réinitialisées",
			metrics,
		});
	} catch (err) {
		console.error("❌ [API] Erreur réinitialisation métriques cache:", err);
		res.status(500).json({
			message: "Failed to reset cache metrics",
			error: err.message,
		});
	}
});

export default router;
