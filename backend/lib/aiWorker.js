/**
 * aiWorker.js
 *
 * Connecte la Job Queue avec l'AI Service.
 * Configure l'executor pour traiter les différents types de jobs.
 */

import { aiQueue } from "./aiQueue.js";
import * as aiService from "./aiService.js";

/**
 * Configure l'executor de la queue
 * Cette fonction détermine comment chaque type de job est traité
 */
export function initializeAIWorker() {
	aiQueue.setExecutor(async (job) => {
		switch (job.type) {
			case "generate-question":
				return await aiService.generateQuestion(job.data.note);

			case "evaluate-answer":
				return await aiService.evaluateAnswer(
					job.data.question,
					job.data.userAnswer,
					job.data.correctContext
				);

			case "generate-hint":
				return await aiService.generateHint(job.data.note);

			case "pre-generate":
				// Pour la pré-génération, on génère juste la question
				// Le système de cache la stockera ensuite
				return await aiService.generateQuestion(job.data.note);

			default:
				throw new Error(`Type de job inconnu: ${job.type}`);
		}
	});

	console.log("✅ AI Worker initialisé");
}

/**
 * Démarre le worker
 */
export function startAIWorker() {
	initializeAIWorker();
	console.log("🚀 AI Worker démarré et prêt à traiter les jobs");
}
