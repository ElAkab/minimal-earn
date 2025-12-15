/**
 * smartScheduler.js
 *
 * Nouveau scheduler simplifié, maintenable et modulaire.
 * Basé sur 2 facteurs principaux :
 * 1. intensity : Fréquence de base choisie par l'utilisateur (chill/moderate/intensive)
 * 2. difficulty_rating : Note de difficulté 1-5 issue de l'évaluation IA
 *
 * Philosophie :
 * - Plus le difficulty_rating est bas (1-2), plus on révise souvent
 * - Plus le difficulty_rating est haut (4-5), moins on révise souvent
 * - L'intensité définit la fréquence de base
 * - Le difficulty_rating ajuste cette fréquence
 *
 * Architecture modulaire :
 * - Chaque fonction a une responsabilité unique
 * - Facilement testable
 * - Extensible pour futures fonctionnalités
 */

// =====================
// CONFIGURATION
// =====================

/**
 * Intervalles de base par intensité (en heures)
 * Ces valeurs définissent la fréquence minimale de révision
 */
const BASE_INTERVALS = {
	chill: 24, // 1 fois par jour
	moderate: 12, // 2 fois par jour
	intensive: 8, // 3 fois par jour
	soon: 1, // 1 heure (révision immédiate)
};

/**
 * Multiplicateurs par difficulty_rating
 * Ajustent l'intervalle de base selon la difficulté perçue
 *
 * Exemple : difficulty_rating = 1 (très difficile)
 * - Intervalle de base × 0.5 = révision plus fréquente
 *
 * Exemple : difficulty_rating = 5 (très facile)
 * - Intervalle de base × 3.0 = révision moins fréquente
 */
const DIFFICULTY_MULTIPLIERS = {
	1: 0.5, // Très difficile : réviser 2x plus souvent
	2: 0.75, // Difficile : réviser un peu plus souvent
	3: 1.0, // Moyen : intervalle normal
	4: 1.5, // Facile : réviser un peu moins souvent
	5: 3.0, // Très facile : réviser 3x moins souvent
};

/**
 * Multiplicateur de progression
 * Augmente progressivement l'intervalle après chaque révision réussie
 */
const PROGRESSION_MULTIPLIER = 1.5;

/**
 * Multiplicateur de régression
 * Réduit l'intervalle après une révision échouée
 */
const REGRESSION_MULTIPLIER = 0.5;

// =====================
// FONCTIONS PRINCIPALES
// =====================

/**
 * Calcule l'intervalle de base en heures
 * @param {string} intensity - "chill", "moderate", "intensive", ou "soon"
 * @returns {number} - Intervalle en heures
 */
export function getBaseInterval(intensity) {
	return BASE_INTERVALS[intensity] || BASE_INTERVALS.moderate;
}

/**
 * Calcule le multiplicateur de difficulté
 * @param {number} difficultyRating - Note de difficulté (1-5)
 * @returns {number} - Multiplicateur
 */
export function getDifficultyMultiplier(difficultyRating) {
	// Valider le rating (entre 1 et 5)
	const rating = Math.max(1, Math.min(5, difficultyRating));
	return DIFFICULTY_MULTIPLIERS[rating];
}

/**
 * Calcule l'intervalle optimal pour la prochaine révision
 * @param {Object} params - Paramètres de calcul
 * @param {string} params.intensity - Intensité choisie
 * @param {number} params.difficultyRating - Note de difficulté (1-5)
 * @param {number} params.reviewCount - Nombre de révisions déjà effectuées
 * @param {boolean} params.wasCorrect - La dernière réponse était-elle correcte ?
 * @returns {number} - Intervalle en heures
 */
export function calculateNextInterval({
	intensity,
	difficultyRating,
	reviewCount = 0,
	wasCorrect = true,
}) {
	// 1. Intervalle de base selon l'intensité
	const baseInterval = getBaseInterval(intensity);

	// 2. Ajustement selon la difficulté
	const difficultyMultiplier = getDifficultyMultiplier(difficultyRating);

	// 3. Ajustement selon la progression (révisions réussies successives)
	let progressionMultiplier = 1.0;
	if (wasCorrect && reviewCount > 0) {
		// Augmenter progressivement l'intervalle
		progressionMultiplier = Math.pow(
			PROGRESSION_MULTIPLIER,
			Math.min(reviewCount, 5)
		);
	} else if (!wasCorrect) {
		// Réduire l'intervalle après un échec
		progressionMultiplier = REGRESSION_MULTIPLIER;
	}

	// 4. Calcul final
	const finalInterval =
		baseInterval * difficultyMultiplier * progressionMultiplier;

	// 5. Limites min/max (entre 1h et 30 jours)
	return Math.max(1, Math.min(finalInterval, 24 * 30));
}

/**
 * Calcule la date de prochaine révision
 * @param {Object} params - Paramètres (mêmes que calculateNextInterval)
 * @returns {Date} - Date de la prochaine révision
 */
export function calculateNextReviewDate(params) {
	const intervalHours = calculateNextInterval(params);
	const nextDate = new Date();
	nextDate.setHours(nextDate.getHours() + intervalHours);
	return nextDate;
}

/**
 * Détermine le difficulty_rating initial basé sur l'évaluation IA
 * @param {boolean} wasCorrect - La réponse était-elle correcte ?
 * @param {number} responseTime - Temps de réponse en secondes
 * @returns {number} - difficulty_rating (1-5)
 */
export function estimateDifficultyRating(wasCorrect, responseTime = 0) {
	if (!wasCorrect) {
		// Réponse incorrecte : difficile (1-2)
		return responseTime > 60 ? 1 : 2;
	}

	// Réponse correcte : ajuster selon le temps de réponse
	if (responseTime < 10) {
		return 5; // Très rapide : très facile
	} else if (responseTime < 30) {
		return 4; // Rapide : facile
	} else if (responseTime < 60) {
		return 3; // Normal : moyen
	} else {
		return 2; // Lent : un peu difficile
	}
}

/**
 * Ajuste le difficulty_rating en fonction de l'historique
 * @param {number} currentRating - Rating actuel
 * @param {boolean} wasCorrect - Dernière réponse correcte ?
 * @returns {number} - Nouveau rating (1-5)
 */
export function adjustDifficultyRating(currentRating, wasCorrect) {
	if (wasCorrect) {
		// Augmenter la difficulté perçue (la note devient plus facile)
		return Math.min(5, currentRating + 0.5);
	} else {
		// Diminuer la difficulté perçue (la note devient plus difficile)
		return Math.max(1, currentRating - 0.5);
	}
}

// =====================
// FONCTIONS UTILITAIRES
// =====================

/**
 * Détermine si une note doit être révisée maintenant
 * @param {Date|string} nextReviewDate - Date de prochaine révision
 * @returns {boolean} - true si révision due
 */
export function isDueForReview(nextReviewDate) {
	const now = new Date();
	const reviewDate =
		typeof nextReviewDate === "string"
			? new Date(nextReviewDate)
			: nextReviewDate;
	return reviewDate <= now;
}

/**
 * Retourne un résumé du scheduling pour une note
 * @param {Object} params - Paramètres
 * @returns {Object} - Résumé du scheduling
 */
export function getSchedulingSummary(params) {
	const intervalHours = calculateNextInterval(params);
	const nextDate = calculateNextReviewDate(params);

	return {
		intervalHours: intervalHours.toFixed(2),
		intervalDays: (intervalHours / 24).toFixed(2),
		nextReviewDate: nextDate.toISOString(),
		difficultyRating: params.difficultyRating,
		intensity: params.intensity,
		reviewCount: params.reviewCount || 0,
	};
}

// =====================
// VALIDATION
// =====================

/**
 * Valide les paramètres de scheduling
 * @param {Object} params - Paramètres à valider
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function validateSchedulingParams(params) {
	const errors = [];

	if (!params.intensity || !BASE_INTERVALS[params.intensity]) {
		errors.push(`Intensité invalide: ${params.intensity}`);
	}

	if (params.difficultyRating < 1 || params.difficultyRating > 5) {
		errors.push(
			`difficulty_rating doit être entre 1 et 5 (reçu: ${params.difficultyRating})`
		);
	}

	if (params.reviewCount < 0) {
		errors.push(
			`reviewCount ne peut pas être négatif (reçu: ${params.reviewCount})`
		);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

// =====================
// EXPORT DE CONFIGURATION (pour page Paramètres future)
// =====================

/**
 * Retourne la configuration actuelle du scheduler
 * Utile pour afficher les réglages dans une page Paramètres
 */
export function getSchedulerConfig() {
	return {
		baseIntervals: BASE_INTERVALS,
		difficultyMultipliers: DIFFICULTY_MULTIPLIERS,
		progressionMultiplier: PROGRESSION_MULTIPLIER,
		regressionMultiplier: REGRESSION_MULTIPLIER,
	};
}

/**
 * Permet de modifier la configuration (pour future page Paramètres)
 * Note : Cette fonction modifie les constantes en mémoire
 * Pour une vraie application, il faudrait persister ces changements
 */
export function updateSchedulerConfig(newConfig) {
	if (newConfig.baseIntervals) {
		Object.assign(BASE_INTERVALS, newConfig.baseIntervals);
	}
	if (newConfig.difficultyMultipliers) {
		Object.assign(DIFFICULTY_MULTIPLIERS, newConfig.difficultyMultipliers);
	}
	console.log("⚙️ Configuration du scheduler mise à jour");
}
