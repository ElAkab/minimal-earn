import express from "express";
import * as dataStore from "../lib/dataStore.js";
import * as reviewStore from "../lib/reviewStore.js";
import * as smartScheduler from "../lib/smartScheduler.js";
import {
	queueGenerateQuestion,
	queueEvaluateAnswer,
	queueGenerateHint,
	aiQueue,
} from "../lib/aiQueue.js";
import * as questionCache from "../lib/questionCache.js";

/**
 * newRoutes.js
 *
 * Nouvelles routes utilisant le système de révisions et le smart scheduler.
 * Ces routes coexistent avec les anciennes pour migration progressive.
 *
 * Préfixe : /api/v2/
 *
 * Routes disponibles :
 * - POST /api/v2/session/start - Démarre une session de révision
 * - GET /api/v2/session/:sessionId/next - Récupère la prochaine question
 * - POST /api/v2/session/submit - Soumet une réponse
 * - GET /api/v2/notes/:id/stats - Statistiques d'une note
 * - GET /api/v2/stats/global - Statistiques globales
 * - GET /api/v2/queue/stats - Statistiques de la queue IA
 */

const router = express.Router();

// =====================
// SESSIONS DE RÉVISION
// =====================

/**
 * POST /api/v2/session/start
 * Démarre une nouvelle session de révision
 *
 * Body: { intensity } (optionnel, défaut "moderate")
 *
 * Retourne :
 * - session_id : ID unique de la session
 * - notes_to_review : Liste des notes à réviser
 */
router.post("/session/start", async (req, res) => {
	try {
		const intensity = req.body.intensity || "moderate";
		const sessionId = `session_${Date.now()}`;

		// Récupérer les notes dues pour révision
		const dueNoteIds = await reviewStore.getDueReviews();
		const allNotes = await dataStore.readNotes();

		// Filtrer les notes par intensité et par échéance
		let notesToReview = allNotes.filter((note) => {
			// Si la note est due OU si c'est la première fois
			const isDue = dueNoteIds.includes(note.id);
			const matchesIntensity = note.intensity === intensity;
			return (isDue || note.reviewCount === 0) && matchesIntensity;
		});

		// Limiter à 10 notes max par session
		notesToReview = notesToReview.slice(0, 10);

		console.log(
			`📚 Session démarrée: ${sessionId} (${notesToReview.length} notes)`
		);

		res.json({
			session_id: sessionId,
			intensity,
			notes_to_review: notesToReview.map((n) => ({
				id: n.id,
				title: n.title,
				intensity: n.intensity,
			})),
			total_notes: notesToReview.length,
		});
	} catch (error) {
		console.error("❌ Erreur démarrage session:", error);
		res
			.status(500)
			.json({ message: "Erreur démarrage session", error: error.message });
	}
});

/**
 * GET /api/v2/session/:sessionId/next
 * Récupère la prochaine question pour une session
 *
 * Query params:
 * - noteId : ID de la note à questionner
 *
 * Retourne :
 * - question : Question générée
 * - model : Modèle IA utilisé
 * - cached : Si la question vient du cache
 * - note : Informations sur la note
 */
router.get("/session/:sessionId/next", async (req, res) => {
	try {
		const { sessionId } = req.params;
		const noteId = parseInt(req.query.noteId);

		if (!noteId) {
			return res.status(400).json({ message: "noteId requis" });
		}

		// Récupérer la note
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === noteId);

		if (!note) {
			return res.status(404).json({ message: "Note non trouvée" });
		}

		// Vérifier le cache
		const cached = await questionCache.getCachedQuestion(noteId);

		if (cached) {
			console.log(`⚡ Question servie depuis le cache pour note ${noteId}`);
			questionCache.recordCacheHit();

			return res.json({
				question: cached.question,
				model: cached.model,
				cached: true,
				generated_at: cached.generatedAt,
				note: {
					id: note.id,
					title: note.title,
					intensity: note.intensity,
				},
			});
		}

		// Pas en cache : ajouter à la queue avec priorité haute
		console.log(`🔄 Génération question pour note ${noteId}...`);
		questionCache.recordCacheMiss();

		const result = await queueGenerateQuestion(note, 1); // Priorité haute

		// Mettre en cache
		await questionCache.cacheQuestion(noteId, result.question, result.model);
		questionCache.recordGeneration();

		res.json({
			question: result.question,
			model: result.model,
			cached: false,
			generated_at: new Date().toISOString(),
			note: {
				id: note.id,
				title: note.title,
				intensity: note.intensity,
			},
		});
	} catch (error) {
		console.error("❌ Erreur récupération question:", error);
		res
			.status(500)
			.json({ message: "Erreur récupération question", error: error.message });
	}
});

/**
 * POST /api/v2/session/submit
 * Soumet une réponse et enregistre la révision
 *
 * Body:
 * - session_id : ID de la session
 * - note_id : ID de la note
 * - question : Question posée
 * - user_response : Réponse de l'utilisateur
 * - response_time : Temps de réponse en secondes
 *
 * Retourne :
 * - evaluation : { isCorrect, feedback }
 * - difficulty_rating : Note de difficulté calculée
 * - next_review_date : Date de la prochaine révision
 * - scheduling_summary : Détails du scheduling
 */
router.post("/session/submit", async (req, res) => {
	try {
		const {
			session_id,
			note_id,
			question,
			user_response,
			response_time = 0,
		} = req.body;

		if (!note_id || !user_response) {
			return res
				.status(400)
				.json({ message: "note_id et user_response requis" });
		}

		// Récupérer la note
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === parseInt(note_id));

		if (!note) {
			return res.status(404).json({ message: "Note non trouvée" });
		}

		// Évaluer la réponse via la queue (priorité haute)
		console.log(`🤖 Évaluation de la réponse pour note ${note_id}...`);
		const evaluation = await queueEvaluateAnswer(
			{
				question,
				userAnswer: user_response,
				correctContext: note.description,
			},
			1
		);

		// Calculer le difficulty_rating
		const lastReview = await reviewStore.getLastReview(note_id);
		let difficultyRating;

		if (lastReview) {
			// Ajuster selon l'historique
			difficultyRating = smartScheduler.adjustDifficultyRating(
				lastReview.difficulty_rating,
				evaluation.isCorrect
			);
		} else {
			// Première révision : estimer selon la réponse
			difficultyRating = smartScheduler.estimateDifficultyRating(
				evaluation.isCorrect,
				response_time
			);
		}

		// Calculer la prochaine date de révision
		const reviewCount = (note.reviewCount || 0) + 1;
		const nextReviewDate = smartScheduler.calculateNextReviewDate({
			intensity: note.intensity,
			difficultyRating,
			reviewCount,
			wasCorrect: evaluation.isCorrect,
		});

		// Créer l'enregistrement de révision
		const review = await reviewStore.createReview({
			session_id,
			note_id,
			ia_question: question,
			ia_model: "ai-service", // On pourrait tracker le vrai modèle
			user_response,
			ia_evaluation: evaluation.isCorrect,
			ia_feedback: evaluation.feedback,
			difficulty_rating: difficultyRating,
			response_time,
			next_review_date: nextReviewDate.toISOString(),
		});

		// Mettre à jour la note (pour compatibilité)
		note.reviewCount = reviewCount;
		note.lastReviewed = new Date().toISOString();
		await dataStore.writeNotes(notes);

		// Résumé du scheduling
		const schedulingSummary = smartScheduler.getSchedulingSummary({
			intensity: note.intensity,
			difficultyRating,
			reviewCount,
			wasCorrect: evaluation.isCorrect,
		});

		console.log(
			`✅ Révision enregistrée pour note ${note_id} (difficulty: ${difficultyRating})`
		);

		res.json({
			evaluation: {
				isCorrect: evaluation.isCorrect,
				feedback: evaluation.feedback,
			},
			difficulty_rating: difficultyRating,
			next_review_date: nextReviewDate.toISOString(),
			scheduling_summary: schedulingSummary,
			review_id: review.id,
		});
	} catch (error) {
		console.error("❌ Erreur soumission réponse:", error);
		res
			.status(500)
			.json({ message: "Erreur soumission réponse", error: error.message });
	}
});

/**
 * GET /api/v2/session/:sessionId/hint
 * Génère un indice pour aider l'utilisateur
 *
 * Query params:
 * - noteId : ID de la note
 *
 * Retourne :
 * - hint : Indice généré
 */
router.get("/session/:sessionId/hint", async (req, res) => {
	try {
		const noteId = parseInt(req.query.noteId);

		if (!noteId) {
			return res.status(400).json({ message: "noteId requis" });
		}

		// Récupérer la note
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === noteId);

		if (!note) {
			return res.status(404).json({ message: "Note non trouvée" });
		}

		// Générer l'indice via la queue (priorité haute)
		console.log(`💡 Génération indice pour note ${noteId}...`);
		const hint = await queueGenerateHint(note, 1);

		res.json({ hint });
	} catch (error) {
		console.error("❌ Erreur génération indice:", error);
		res
			.status(500)
			.json({ message: "Erreur génération indice", error: error.message });
	}
});

// =====================
// STATISTIQUES
// =====================

/**
 * GET /api/v2/notes/:id/stats
 * Récupère les statistiques d'une note spécifique
 */
router.get("/notes/:id/stats", async (req, res) => {
	try {
		const noteId = parseInt(req.params.id);
		const stats = await reviewStore.getNoteStats(noteId);
		res.json(stats);
	} catch (error) {
		console.error("❌ Erreur récupération stats note:", error);
		res
			.status(500)
			.json({ message: "Erreur récupération stats", error: error.message });
	}
});

/**
 * GET /api/v2/stats/global
 * Récupère les statistiques globales
 */
router.get("/stats/global", async (req, res) => {
	try {
		const stats = await reviewStore.getGlobalStats();
		res.json(stats);
	} catch (error) {
		console.error("❌ Erreur récupération stats globales:", error);
		res
			.status(500)
			.json({ message: "Erreur récupération stats", error: error.message });
	}
});

/**
 * GET /api/v2/queue/stats
 * Récupère les statistiques de la queue IA
 */
router.get("/queue/stats", async (req, res) => {
	try {
		const stats = aiQueue.getStats();
		res.json(stats);
	} catch (error) {
		console.error("❌ Erreur récupération stats queue:", error);
		res
			.status(500)
			.json({
				message: "Erreur récupération stats queue",
				error: error.message,
			});
	}
});

// =====================
// CONFIGURATION
// =====================

/**
 * GET /api/v2/config/scheduler
 * Retourne la configuration du scheduler
 */
router.get("/config/scheduler", (req, res) => {
	try {
		const config = smartScheduler.getSchedulerConfig();
		res.json(config);
	} catch (error) {
		res
			.status(500)
			.json({ message: "Erreur récupération config", error: error.message });
	}
});

export default router;
