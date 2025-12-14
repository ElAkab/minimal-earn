/**
 * Session-based Scheduler
 *
 * Système de révision basé sur des sessions avec fenêtres horaires fixes.
 * Logique simple :
 * - Chaque intensité définit des créneaux horaires prédéfinis
 * - Une session active = un moment où l'utilisateur peut répondre
 * - Une seule note interrogée à la fois
 * - Le backend choisit la note prioritaire (due, ancienne, difficile)
 * - Pas de calcul complexe, pas d'IA pour le scheduling
 */

// Configuration des fenêtres horaires par intensité
const SESSION_CONFIG = {
	soon: {
		// Mode test : session toutes les 2 minutes (pour tests rapides)
		windows: [
			{ day: null, hour: null, minute: null, interval: 2 * 60 * 1000 }, // Toutes les 2 minutes
		],
		maxNotesPerSession: 3,
	},
	chill: {
		// Mode relax : 1 session par semaine
		windows: [
			{ day: 0, hour: 10, minute: 0 }, // Dimanche 10h
		],
		maxNotesPerSession: 5, // Maximum 5 notes par session
	},
	moderate: {
		// Mode modéré : 1 session par jour
		windows: [
			{ day: null, hour: 9, minute: 0 }, // Tous les jours à 9h
		],
		maxNotesPerSession: 10,
	},
	intensive: {
		// Mode intensif : 3 sessions par jour
		windows: [
			{ day: null, hour: 9, minute: 0 }, // Matin 9h
			{ day: null, hour: 14, minute: 0 }, // Après-midi 14h
			{ day: null, hour: 20, minute: 0 }, // Soir 20h
		],
		maxNotesPerSession: 15,
	},
};

/**
 * Calcule la prochaine session pour une intensité donnée
 * @param {string} intensity - "soon", "chill", "moderate", "intensive"
 * @param {Date} from - Date de référence (par défaut: maintenant)
 * @returns {Date} - Date de la prochaine session
 * Exemple : getNextSessionTime("moderate", new Date())
 */
export function getNextSessionTime(intensity, from = new Date()) {
	const config = SESSION_CONFIG[intensity] || SESSION_CONFIG.moderate;
	const windows = config.windows;

	// Trouver la prochaine session
	let nextSession = null;
	// différence minimale, Infinity au départ car on cherche le plus proche
	let minDiff = Infinity;

	// Pour chaque fenêtre horaire configurée
	for (const window of windows) {
		// Mode "soon" : intervalle régulier basé sur l'heure actuelle
		if (window.interval) {
			const nextTime = new Date(from.getTime() + window.interval);
			return nextTime;
		}

		const candidate = new Date(from); // Commencer à partir de la date "from"

		// Si un jour spécifique est défini (pour "chill" par exemple)
		if (window.day !== null) {
			const currentDay = from.getDay();
			const targetDay = window.day;
			let daysToAdd = targetDay - currentDay;

			// Si le jour cible est passé cette semaine, aller à la semaine prochaine
			if (daysToAdd < 0) {
				daysToAdd += 7;
			}
			// Si c'est aujourd'hui mais l'heure est passée, aller à la semaine prochaine
			else if (daysToAdd === 0) {
				candidate.setHours(window.hour, window.minute, 0, 0);
				if (candidate <= from) {
					daysToAdd = 7;
				}
			}

			candidate.setDate(candidate.getDate() + daysToAdd);
		}

		// Définir l'heure et les minutes
		candidate.setHours(window.hour, window.minute, 0, 0);

		// Si la session est dans le passé aujourd'hui, passer au lendemain
		if (window.day === null && candidate <= from) {
			candidate.setDate(candidate.getDate() + 1);
		}

		// Garder la session la plus proche
		const diff = candidate - from;
		if (diff > 0 && diff < minDiff) {
			minDiff = diff;
			nextSession = candidate;
		}
	}

	return nextSession;
}

/**
 * Vérifie si une session est actuellement active
 * Tolerance: ±30 minutes autour de l'heure de session (sauf pour "soon" qui est toujours actif pour tests)
 * @param {string} intensity - "soon", "chill", "moderate", "intensive"
 * @param {Date} now - Date actuelle (par défaut: maintenant)
 * @returns {boolean} - true si une session est active
 */
export function isSessionActive(intensity, now = new Date()) {
	const config = SESSION_CONFIG[intensity] || SESSION_CONFIG.moderate;
	const TOLERANCE_MS = 30 * 60 * 1000; // 30 minutes en millisecondes

	for (const window of config.windows) {
		// Mode "soon" : toujours actif (pour tests)
		if (window.interval) {
			return true;
		}

		// Vérifier le jour si spécifié
		if (window.day !== null && now.getDay() !== window.day) {
			continue;
		}

		// Créer une date pour la fenêtre actuelle
		const sessionTime = new Date(now);
		sessionTime.setHours(window.hour, window.minute, 0, 0);

		// Calculer la différence en millisecondes
		const diff = Math.abs(now - sessionTime);

		// Si on est dans la tolérance, la session est active
		if (diff <= TOLERANCE_MS) {
			return true;
		}
	}

	return false;
}

/**
 * Sélectionne la prochaine note à réviser (logique de priorisation)
 * Priorités :
 * 1. Notes jamais révisées (lastReviewed = null)
 * 2. Notes les plus anciennes non révisées
 * 3. Notes avec le plus faible taux de succès (reviewCount faible)
 * @param {Array} notes - Liste des notes disponibles pour une intensité
 * @returns {Object|null} - Note sélectionnée ou null
 */
export function selectPriorityNote(notes) {
	if (!notes || notes.length === 0) return null;

	// Filtrer les notes jamais révisées
	const neverReviewed = notes.filter((n) => !n.lastReviewed);
	if (neverReviewed.length > 0) {
		// Prendre la plus ancienne (createdAt)
		return neverReviewed.sort(
			(a, b) => new Date(a.createdAt) - new Date(b.createdAt)
		)[0];
	}

	// Sinon, prendre les notes déjà révisées
	const reviewed = notes.filter((n) => n.lastReviewed);
	if (reviewed.length === 0) return null;

	// Trier par :
	// 1. Plus ancien lastReviewed
	// 2. Plus faible reviewCount (en cas d'égalité)
	return reviewed.sort((a, b) => {
		const dateA = new Date(a.lastReviewed);
		const dateB = new Date(b.lastReviewed);
		const dateDiff = dateA - dateB;

		if (dateDiff !== 0) return dateDiff;

		// En cas d'égalité de date, prioriser le plus faible reviewCount
		return (a.reviewCount || 0) - (b.reviewCount || 0);
	})[0];
}

/**
 * Récupère les notes éligibles pour la session actuelle
 * @param {Array} allNotes - Toutes les notes
 * @param {string} intensity - Intensité à filtrer
 * @param {number} maxNotes - Nombre maximum de notes à retourner
 * @returns {Array} - Notes éligibles pour cette session
 */
export function getSessionNotes(allNotes, intensity, maxNotes = null) {
	const config = SESSION_CONFIG[intensity] || SESSION_CONFIG.moderate;
	const limit = maxNotes || config.maxNotesPerSession;

	// Filtrer les notes par intensité
	const notesForIntensity = allNotes.filter((n) => n.intensity === intensity);

	// Si on dépasse la limite, prioriser les notes
	if (notesForIntensity.length <= limit) {
		return notesForIntensity;
	}

	// Sinon, sélectionner les notes prioritaires jusqu'à la limite
	const prioritized = [];
	const remaining = [...notesForIntensity];

	while (prioritized.length < limit && remaining.length > 0) {
		const selected = selectPriorityNote(remaining);
		if (!selected) break;

		prioritized.push(selected);
		const idx = remaining.findIndex((n) => n.id === selected.id);
		remaining.splice(idx, 1);
	}

	return prioritized;
}

/**
 * Marque une note comme révisée (simplement mise à jour des timestamps)
 * @param {Object} note - Note à mettre à jour
 * @param {boolean} correct - La réponse était-elle correcte ?
 * @returns {Object} - Métadonnées de mise à jour
 */
export function recordReview(note, correct) {
	return {
		lastReviewed: new Date().toISOString(),
		reviewCount: (note.reviewCount || 0) + (correct ? 1 : 0),
		// Pas de calcul complexe d'intervalle : simplement enregistrer la révision
	};
}

/**
 * Obtient la configuration des sessions (pour export vers frontend ou page Paramètres)
 * @returns {Object} - Configuration des sessions par intensité
 */
export function getSessionConfig() {
	return SESSION_CONFIG;
}

/**
 * Met à jour la configuration des sessions (anticipation future page Paramètres)
 * Pour l'instant, cette fonction est un placeholder
 * @param {Object} newConfig - Nouvelle configuration
 */
export function updateSessionConfig(newConfig) {
	// TODO: À implémenter quand la page Paramètres sera développée
	// Validation et mise à jour de SESSION_CONFIG
	throw new Error(
		"updateSessionConfig not yet implemented - waiting for Settings page"
	);
}

/**
 * Récupère les notes des sessions à venir dans une fenêtre temporelle donnée
 * Utile pour la pré-génération de questions en anticipant les prochaines sessions
 *
 * @param {Array} allNotes - Toutes les notes disponibles
 * @param {string} intensity - Intensité à analyser
 * @param {number} lookahead - Durée d'anticipation en millisecondes (défaut: 24h)
 * @returns {Object} - { nextSession: Date, notes: Array, timeUntil: number }
 *
 * @example
 * // Anticiper les notes de la prochaine session intensive dans les 24h
 * const upcoming = getUpcomingSessionNotes(notes, 'intensive', 24 * 60 * 60 * 1000);
 * console.log(`Prochaine session dans ${upcoming.timeUntil}ms avec ${upcoming.notes.length} notes`);
 */
export function getUpcomingSessionNotes(
	allNotes,
	intensity,
	lookahead = 24 * 60 * 60 * 1000
) {
	const now = new Date();
	const nextSession = getNextSessionTime(intensity, now);

	// Calculer le temps restant jusqu'à la prochaine session
	const timeUntil = nextSession ? nextSession.getTime() - now.getTime() : null;

	// Si la prochaine session est hors de la fenêtre d'anticipation, retourner vide
	if (!timeUntil || timeUntil > lookahead) {
		return {
			nextSession,
			notes: [],
			timeUntil,
			withinLookahead: false,
		};
	}

	// Récupérer les notes éligibles pour cette session
	const notes = getSessionNotes(allNotes, intensity);

	return {
		nextSession,
		notes,
		timeUntil,
		withinLookahead: true,
	};
}

/**
 * Récupère toutes les sessions à venir pour toutes les intensités
 * Retourne un résumé des prochaines sessions dans la fenêtre de lookahead
 *
 * @param {Array} allNotes - Toutes les notes disponibles
 * @param {number} lookahead - Durée d'anticipation en millisecondes (défaut: 24h)
 * @returns {Array} - Liste des sessions à venir par intensité
 *
 * @example
 * const upcoming = getAllUpcomingSessions(notes, 24 * 60 * 60 * 1000);
 * upcoming.forEach(session => {
 *   console.log(`${session.intensity}: ${session.notes.length} notes dans ${session.timeUntil}ms`);
 * });
 */
export function getAllUpcomingSessions(
	allNotes,
	lookahead = 24 * 60 * 60 * 1000
) {
	const intensities = ["intensive", "moderate", "chill"];
	const upcomingSessions = [];

	for (const intensity of intensities) {
		const sessionInfo = getUpcomingSessionNotes(allNotes, intensity, lookahead);

		upcomingSessions.push({
			intensity,
			...sessionInfo,
		});
	}

	// Trier par proximité (sessions les plus proches en premier)
	return upcomingSessions
		.filter((s) => s.nextSession !== null)
		.sort((a, b) => a.timeUntil - b.timeUntil);
}
