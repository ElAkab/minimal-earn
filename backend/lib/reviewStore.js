import fs from "fs/promises";
import path from "path";

/**
 * reviewStore.js
 *
 * Gestion des révisions (reviews) - sépare clairement les Notes des sessions de révision.
 *
 * Structure d'une révision :
 * {
 *   id: number,                    // ID unique de la révision
 *   session_id: string,            // ID de session pour grouper les révisions (format: "session_TIMESTAMP")
 *   note_id: number,               // Référence à la note source
 *   ia_question: string,           // Question générée par l'IA
 *   ia_model: string,              // Modèle IA utilisé
 *   user_response: string,         // Réponse de l'utilisateur
 *   ia_evaluation: boolean,        // Évaluation IA : true = correct, false = incorrect
 *   ia_feedback: string,           // Feedback textuel de l'IA
 *   difficulty_rating: number,     // Note de difficulté 1-5 (clé du scheduler)
 *   response_time: number,         // Temps de réponse en secondes
 *   next_review_date: string,      // Date ISO de la prochaine révision
 *   reviewed_at: string,           // Date ISO de cette révision
 *   created_at: string             // Date ISO de création
 * }
 *
 * Le difficulty_rating est la clé principale du scheduler :
 * - 1 : Très difficile (réviser très souvent)
 * - 2 : Difficile (réviser souvent)
 * - 3 : Moyen (réviser normalement)
 * - 4 : Facile (réviser moins souvent)
 * - 5 : Très facile (réviser rarement)
 */

const __filename = import.meta.filename;
const __dirname = path.dirname(__filename);
const REVIEWS_FILE = path.join(__dirname, "..", "data", "reviews.json");

/**
 * Lit toutes les révisions
 * @returns {Promise<Array>} - Liste des révisions
 */
export async function readReviews() {
	try {
		const data = await fs.readFile(REVIEWS_FILE, "utf8");
		return JSON.parse(data);
	} catch (err) {
		// Si le fichier n'existe pas, retourner tableau vide
		if (err.code === "ENOENT") {
			console.log("📝 Fichier reviews.json inexistant, création...");
			await writeReviews([]);
			return [];
		}
		throw err;
	}
}

/**
 * Écrit les révisions
 * @param {Array} reviews - Liste des révisions
 * @returns {Promise<void>}
 */
export async function writeReviews(reviews) {
	await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf8");
}

/**
 * Crée une nouvelle révision
 * @param {Object} reviewData - Données de la révision
 * @returns {Promise<Object>} - Révision créée
 */
export async function createReview(reviewData) {
	const reviews = await readReviews();

	const review = {
		id: Date.now(),
		session_id: reviewData.session_id || `session_${Date.now()}`,
		note_id: reviewData.note_id,
		ia_question: reviewData.ia_question,
		ia_model: reviewData.ia_model || "unknown",
		user_response: reviewData.user_response,
		ia_evaluation: reviewData.ia_evaluation,
		ia_feedback: reviewData.ia_feedback || "",
		difficulty_rating: reviewData.difficulty_rating || 3,
		response_time: reviewData.response_time || 0,
		next_review_date: reviewData.next_review_date,
		reviewed_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	};

	reviews.push(review);
	await writeReviews(reviews);

	console.log(
		`✅ Révision créée pour note ${review.note_id} (difficulty: ${review.difficulty_rating})`
	);
	return review;
}

/**
 * Récupère toutes les révisions d'une note spécifique
 * @param {number} noteId - ID de la note
 * @returns {Promise<Array>} - Liste des révisions pour cette note
 */
export async function getReviewsByNote(noteId) {
	const reviews = await readReviews();
	return reviews.filter((r) => r.note_id === noteId);
}

/**
 * Récupère toutes les révisions d'une session
 * @param {string} sessionId - ID de la session
 * @returns {Promise<Array>} - Liste des révisions pour cette session
 */
export async function getReviewsBySession(sessionId) {
	const reviews = await readReviews();
	return reviews.filter((r) => r.session_id === sessionId);
}

/**
 * Récupère la dernière révision d'une note
 * @param {number} noteId - ID de la note
 * @returns {Promise<Object|null>} - Dernière révision ou null
 */
export async function getLastReview(noteId) {
	const reviews = await getReviewsByNote(noteId);
	if (reviews.length === 0) return null;

	// Trier par date décroissante et prendre la première
	reviews.sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at));
	return reviews[0];
}

/**
 * Calcule les statistiques d'une note
 * @param {number} noteId - ID de la note
 * @returns {Promise<Object>} - Statistiques
 */
export async function getNoteStats(noteId) {
	const reviews = await getReviewsByNote(noteId);

	if (reviews.length === 0) {
		return {
			total: 0,
			correct: 0,
			incorrect: 0,
			successRate: 0,
			averageDifficulty: 3,
			lastReviewed: null,
		};
	}

	const correct = reviews.filter((r) => r.ia_evaluation === true).length;
	const incorrect = reviews.length - correct;
	const avgDifficulty =
		reviews.reduce((sum, r) => sum + r.difficulty_rating, 0) / reviews.length;
	const lastReview = reviews[reviews.length - 1];

	return {
		total: reviews.length,
		correct,
		incorrect,
		successRate: (correct / reviews.length) * 100,
		averageDifficulty: avgDifficulty.toFixed(2),
		lastReviewed: lastReview.reviewed_at,
	};
}

/**
 * Récupère les statistiques globales
 * @returns {Promise<Object>} - Statistiques globales
 */
export async function getGlobalStats() {
	const reviews = await readReviews();

	if (reviews.length === 0) {
		return {
			total: 0,
			correct: 0,
			incorrect: 0,
			successRate: 0,
			averageDifficulty: 3,
			totalNotes: 0,
		};
	}

	const correct = reviews.filter((r) => r.ia_evaluation === true).length;
	const incorrect = reviews.length - correct;
	const avgDifficulty =
		reviews.reduce((sum, r) => sum + r.difficulty_rating, 0) / reviews.length;
	const uniqueNotes = new Set(reviews.map((r) => r.note_id)).size;

	return {
		total: reviews.length,
		correct,
		incorrect,
		successRate: (correct / reviews.length) * 100,
		averageDifficulty: avgDifficulty.toFixed(2),
		totalNotes: uniqueNotes,
	};
}

/**
 * Récupère les révisions nécessitant une révision (next_review_date <= maintenant)
 * @returns {Promise<Array>} - Liste des note_id à réviser
 */
export async function getDueReviews() {
	const reviews = await readReviews();
	const now = new Date();

	// Grouper par note_id et prendre la dernière révision de chaque note
	const latestByNote = {};
	reviews.forEach((review) => {
		if (
			!latestByNote[review.note_id] ||
			new Date(review.reviewed_at) >
				new Date(latestByNote[review.note_id].reviewed_at)
		) {
			latestByNote[review.note_id] = review;
		}
	});

	// Filtrer celles dont next_review_date est passée
	const dueNoteIds = Object.values(latestByNote)
		.filter((review) => new Date(review.next_review_date) <= now)
		.map((review) => review.note_id);

	return dueNoteIds;
}
