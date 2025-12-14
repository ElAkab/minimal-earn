import * as sessionScheduler from "./sessionScheduler.js";
import * as questionCache from "./questionCache.js";
import * as ai from "./ai.js";
import * as dataStore from "./dataStore.js";

/**
 * Pré-générateur de questions pour les sessions à venir
 *
 * Ce module permet de générer les questions en arrière-plan avant les sessions
 * pour améliorer l'expérience utilisateur en réduisant les temps d'attente.
 *
 * Fonctionnalités :
 * - Identifie les notes des prochaines sessions
 * - Vérifie le cache pour éviter la régénération
 * - Génère les questions en utilisant le bon modèle IA
 * - Gestion d'erreurs et timeout robuste
 * - Logs détaillés pour le suivi
 */

/**
 * Configuration du pré-générateur
 */
const PREGENERATOR_CONFIG = {
	// Intensités à pré-générer (par ordre de priorité)
	intensities: ["intensive", "moderate", "chill"],

	// Timeout par question (30 secondes)
	questionTimeout: 30000,

	// Nombre maximum de questions à générer par appel
	maxQuestionsPerRun: 20,

	// Activer/désactiver la pré-génération
	enabled: process.env.PREGENERATE_ENABLED !== "false",
};

/**
 * Résultat de la pré-génération pour une note
 * @typedef {Object} PreGenerateResult
 * @property {number} noteId - ID de la note
 * @property {string} status - 'cached' | 'generated' | 'failed' | 'skipped'
 * @property {string} [question] - Question générée (si succès)
 * @property {string} [model] - Modèle utilisé (si généré)
 * @property {number} [duration] - Durée de génération en ms (si généré)
 * @property {string} [error] - Message d'erreur (si échec)
 */

/**
 * Génère une question avec timeout et gestion d'erreurs
 * @param {Object} note - Note pour laquelle générer la question
 * @param {number} timeout - Timeout en millisecondes
 * @returns {Promise<PreGenerateResult>}
 */
async function generateQuestionWithTimeout(note, timeout) {
	const startTime = Date.now();

	try {
		// Créer une promesse avec timeout
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(
				() => reject(new Error(`Timeout après ${timeout}ms`)),
				timeout
			);
		});

		// Générer la question avec timeout
		const questionPromise = ai.generateQuestion(note);
		const { question, model } = await Promise.race([
			questionPromise,
			timeoutPromise,
		]);

		const duration = Date.now() - startTime;

		return {
			noteId: note.id,
			status: "generated",
			question,
			model,
			duration,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error(
			`❌ [PRE-GEN] Échec génération note ${note.id}:`,
			error.message
		);

		return {
			noteId: note.id,
			status: "failed",
			error: error.message,
			duration,
		};
	}
}

/**
 * Pré-génère les questions pour les notes d'une intensité donnée
 * @param {Array} notes - Liste des notes à traiter
 * @param {string} intensity - Intensité en cours de traitement
 * @returns {Promise<Array<PreGenerateResult>>} - Résultats de la pré-génération
 */
async function preGenerateForIntensity(notes, intensity) {
	console.log(
		`📋 [PRE-GEN] Traitement intensité "${intensity}" : ${notes.length} note(s)`
	);

	const results = [];

	for (const note of notes) {
		try {
			// Vérifier si la question est déjà en cache
			const cached = await questionCache.getCachedQuestion(note.id);

			if (cached) {
				console.log(
					`✅ [PRE-GEN] Note ${note.id} déjà en cache (modèle: ${cached.model})`
				);
				results.push({
					noteId: note.id,
					status: "cached",
					question: cached.question,
					model: cached.model,
				});
				continue;
			}

			// Générer la question avec timeout
			console.log(
				`🤖 [PRE-GEN] Génération pour note ${note.id} (${
					note.title || "sans titre"
				})...`
			);
			const result = await generateQuestionWithTimeout(
				note,
				PREGENERATOR_CONFIG.questionTimeout
			);

			// Si succès, mettre en cache
			if (result.status === "generated") {
				await questionCache.cacheQuestion(
					note.id,
					result.question,
					result.model
				);
				console.log(
					`✅ [PRE-GEN] Question générée et mise en cache pour note ${note.id} (${result.duration}ms)`
				);
			}

			results.push(result);
		} catch (error) {
			console.error(
				`❌ [PRE-GEN] Erreur traitement note ${note.id}:`,
				error.message
			);
			results.push({
				noteId: note.id,
				status: "failed",
				error: error.message,
			});
		}
	}

	return results;
}

/**
 * Pré-génère les questions pour les prochaines sessions
 *
 * Processus :
 * 1. Récupère toutes les notes
 * 2. Pour chaque intensité (par priorité) :
 *    - Identifie les notes de la prochaine session
 *    - Vérifie le cache
 *    - Génère les questions manquantes
 * 3. Retourne un rapport détaillé
 *
 * @param {Object} [options] - Options de configuration
 * @param {Array<string>} [options.intensities] - Intensités à traiter (défaut: toutes)
 * @param {number} [options.maxQuestions] - Nombre max de questions à générer
 * @returns {Promise<Object>} - Rapport de pré-génération
 *
 * @example
 * const report = await preGenerateForUpcomingSessions();
 * console.log(`${report.summary.generated} questions générées`);
 */
export async function preGenerateForUpcomingSessions(options = {}) {
	const startTime = Date.now();

	// Vérifier si la pré-génération est activée
	if (!PREGENERATOR_CONFIG.enabled) {
		console.log(
			"⚠️ [PRE-GEN] Pré-génération désactivée (PREGENERATE_ENABLED=false)"
		);
		return {
			enabled: false,
			summary: { total: 0, cached: 0, generated: 0, failed: 0, skipped: 0 },
			results: [],
			duration: 0,
		};
	}

	console.log("🚀 [PRE-GEN] Démarrage de la pré-génération...");

	try {
		// Récupérer toutes les notes
		const allNotes = await dataStore.readNotes();
		console.log(`📚 [PRE-GEN] ${allNotes.length} note(s) chargée(s)`);

		// Déterminer les intensités à traiter
		const intensitiesToProcess =
			options.intensities || PREGENERATOR_CONFIG.intensities;
		const maxQuestions =
			options.maxQuestions || PREGENERATOR_CONFIG.maxQuestionsPerRun;

		const allResults = [];
		let totalProcessed = 0;

		// Traiter chaque intensité par ordre de priorité
		for (const intensity of intensitiesToProcess) {
			// Vérifier si on a atteint la limite
			if (totalProcessed >= maxQuestions) {
				console.log(
					`⚠️ [PRE-GEN] Limite de ${maxQuestions} questions atteinte, arrêt`
				);
				break;
			}

			// Récupérer les notes pour cette intensité
			const sessionNotes = sessionScheduler.getSessionNotes(
				allNotes,
				intensity
			);

			if (sessionNotes.length === 0) {
				console.log(`ℹ️ [PRE-GEN] Aucune note pour intensité "${intensity}"`);
				continue;
			}

			// Limiter le nombre de notes à traiter
			const remainingQuota = maxQuestions - totalProcessed;
			const notesToProcess = sessionNotes.slice(0, remainingQuota);

			// Pré-générer pour cette intensité
			const intensityResults = await preGenerateForIntensity(
				notesToProcess,
				intensity
			);
			allResults.push(...intensityResults);
			totalProcessed += notesToProcess.length;
		}

		// Calculer les statistiques
		const summary = {
			total: allResults.length,
			cached: allResults.filter((r) => r.status === "cached").length,
			generated: allResults.filter((r) => r.status === "generated").length,
			failed: allResults.filter((r) => r.status === "failed").length,
			skipped: allResults.filter((r) => r.status === "skipped").length,
		};

		const totalDuration = Date.now() - startTime;

		console.log("✅ [PRE-GEN] Pré-génération terminée:");
		console.log(`   📊 Total: ${summary.total}`);
		console.log(`   💾 En cache: ${summary.cached}`);
		console.log(`   ✨ Générées: ${summary.generated}`);
		console.log(`   ❌ Échecs: ${summary.failed}`);
		console.log(`   ⏱️ Durée: ${(totalDuration / 1000).toFixed(2)}s`);

		// Nettoyer le cache expiré de manière asynchrone
		questionCache.cleanExpiredCache().catch((err) => {
			console.error("❌ [PRE-GEN] Erreur nettoyage cache:", err);
		});

		return {
			enabled: true,
			summary,
			results: allResults,
			duration: totalDuration,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		const totalDuration = Date.now() - startTime;
		console.error("❌ [PRE-GEN] Erreur globale:", error);

		return {
			enabled: true,
			summary: { total: 0, cached: 0, generated: 0, failed: 1, skipped: 0 },
			results: [],
			duration: totalDuration,
			error: error.message,
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Obtient la configuration du pré-générateur
 * @returns {Object} - Configuration actuelle
 */
export function getPreGeneratorConfig() {
	return { ...PREGENERATOR_CONFIG };
}

/**
 * Met à jour la configuration du pré-générateur
 * @param {Object} newConfig - Nouvelle configuration (partielle)
 */
export function updatePreGeneratorConfig(newConfig) {
	if (newConfig.intensities && Array.isArray(newConfig.intensities)) {
		PREGENERATOR_CONFIG.intensities = newConfig.intensities;
	}
	if (
		newConfig.questionTimeout &&
		typeof newConfig.questionTimeout === "number"
	) {
		PREGENERATOR_CONFIG.questionTimeout = newConfig.questionTimeout;
	}
	if (
		newConfig.maxQuestionsPerRun &&
		typeof newConfig.maxQuestionsPerRun === "number"
	) {
		PREGENERATOR_CONFIG.maxQuestionsPerRun = newConfig.maxQuestionsPerRun;
	}
	if (typeof newConfig.enabled === "boolean") {
		PREGENERATOR_CONFIG.enabled = newConfig.enabled;
	}

	console.log("⚙️ [PRE-GEN] Configuration mise à jour:", PREGENERATOR_CONFIG);
}
