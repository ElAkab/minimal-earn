/**
 * Scheduler automatique pour la pré-génération
 *
 * Ce module permet de planifier automatiquement la pré-génération
 * à intervalles réguliers ou avant les sessions.
 *
 * PHASE 2 : À implémenter avec node-cron ou similaire
 */

import * as preGenerator from "./preGenerator.js";
import * as sessionScheduler from "./sessionScheduler.js";

/**
 * Configuration du scheduler
 */
const SCHEDULER_CONFIG = {
	// Activer le scheduler automatique
	enabled: process.env.AUTO_PREGENERATE === "true",

	// Intervalle de pré-génération en minutes (défaut: toutes les heures)
	intervalMinutes: parseInt(process.env.PREGENERATE_INTERVAL) || 60,

	// Pré-générer X minutes avant chaque session
	beforeSessionMinutes: 30,
};

/**
 * Pré-génère avant les prochaines sessions de toutes les intensités
 * @returns {Promise<Object>} - Rapport de pré-génération
 */
export async function preGenerateBeforeUpcomingSessions() {
	console.log("🔍 [SCHEDULER] Vérification des prochaines sessions...");

	const now = new Date();
	const intensities = ["intensive", "moderate", "chill"];
	const urgentIntensities = [];

	// Identifier les intensités dont la session approche
	for (const intensity of intensities) {
		const nextSession = sessionScheduler.getNextSessionTime(intensity, now);
		const minutesToSession = (nextSession - now) / 60000;

		if (minutesToSession <= SCHEDULER_CONFIG.beforeSessionMinutes) {
			console.log(
				`⏰ [SCHEDULER] Session "${intensity}" dans ${Math.round(
					minutesToSession
				)} minutes`
			);
			urgentIntensities.push(intensity);
		}
	}

	if (urgentIntensities.length === 0) {
		console.log(
			"✅ [SCHEDULER] Aucune session imminente, pré-génération normale"
		);
		return await preGenerator.preGenerateForUpcomingSessions();
	}

	console.log(
		`🚨 [SCHEDULER] Sessions imminentes: ${urgentIntensities.join(", ")}`
	);
	return await preGenerator.preGenerateForUpcomingSessions({
		intensities: urgentIntensities,
	});
}

/**
 * Démarre le scheduler automatique
 * PHASE 2 : À implémenter avec node-cron
 */
export function startAutoScheduler() {
	if (!SCHEDULER_CONFIG.enabled) {
		console.log("⚠️ [SCHEDULER] Scheduler automatique désactivé");
		return null;
	}

	console.log(`🚀 [SCHEDULER] Démarrage du scheduler automatique`);
	console.log(`   Intervalle: ${SCHEDULER_CONFIG.intervalMinutes} minutes`);
	console.log(
		`   Anticipation sessions: ${SCHEDULER_CONFIG.beforeSessionMinutes} minutes`
	);

	// TODO PHASE 2: Implémenter avec node-cron
	// const cron = require('node-cron');
	//
	// const schedule = `*/${SCHEDULER_CONFIG.intervalMinutes} * * * *`;
	//
	// return cron.schedule(schedule, async () => {
	// 	console.log('\n⏰ [SCHEDULER] Exécution planifiée...');
	// 	try {
	// 		const report = await preGenerateBeforeUpcomingSessions();
	// 		console.log(`✅ [SCHEDULER] ${report.summary.generated} questions générées`);
	// 	} catch (error) {
	// 		console.error('❌ [SCHEDULER] Erreur:', error);
	// 	}
	// });

	console.warn("⚠️ [SCHEDULER] Implémentation du cron en attente (PHASE 2)");
	return null;
}

/**
 * Arrête le scheduler automatique
 * @param {Object} scheduler - Instance du scheduler retournée par startAutoScheduler()
 */
export function stopAutoScheduler(scheduler) {
	if (scheduler) {
		scheduler.stop();
		console.log("🛑 [SCHEDULER] Scheduler arrêté");
	}
}

/**
 * Exemple d'intégration dans server.js
 *
 * ```javascript
 * import * as autoScheduler from './lib/autoScheduler.js';
 *
 * // Au démarrage du serveur
 * const scheduler = autoScheduler.startAutoScheduler();
 *
 * // Lors de l'arrêt du serveur
 * process.on('SIGTERM', () => {
 *   autoScheduler.stopAutoScheduler(scheduler);
 *   server.close();
 * });
 * ```
 */
