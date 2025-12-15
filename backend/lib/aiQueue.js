/**
 * aiQueue.js
 *
 * Job Queue simple pour traiter les tâches IA de manière asynchrone.
 *
 * Problématique :
 * - Les modèles IA (surtout Ollama en local) peuvent être lents
 * - Les appels synchrones bloquent l'API et dégradent l'UX
 * - Risque de surcharge CPU avec plusieurs requêtes simultanées
 *
 * Solution :
 * - File d'attente en mémoire (extensible vers Redis/BullMQ plus tard)
 * - Worker unique traitant les jobs un par un
 * - Support des priorités
 * - Callbacks pour notifier quand le job est terminé
 *
 * Types de jobs supportés :
 * - "generate-question" : Générer une question pour une note
 * - "evaluate-answer" : Évaluer la réponse d'un utilisateur
 * - "generate-hint" : Générer un indice
 * - "pre-generate" : Pré-générer des questions pour le cache
 */

import EventEmitter from "events";

// =====================
// CONFIGURATION
// =====================

/**
 * Priorités des jobs
 * Plus le nombre est petit, plus la priorité est haute
 */
const PRIORITIES = {
	HIGH: 1, // Réponse immédiate demandée par l'utilisateur
	NORMAL: 5, // Génération de question standard
	LOW: 10, // Pré-génération, tâches de fond
};

/**
 * Timeouts par type de job (en ms)
 */
const JOB_TIMEOUTS = {
	"generate-question": 30000, // 30s
	"evaluate-answer": 20000, // 20s
	"generate-hint": 15000, // 15s
	"pre-generate": 60000, // 60s
};

// =====================
// CLASSE JOB
// =====================

class Job {
	constructor(type, data, priority = PRIORITIES.NORMAL) {
		this.id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		this.type = type;
		this.data = data;
		this.priority = priority;
		this.status = "pending"; // pending, processing, completed, failed
		this.result = null;
		this.error = null;
		this.createdAt = new Date();
		this.startedAt = null;
		this.completedAt = null;
	}

	getDuration() {
		if (!this.startedAt) return 0;
		const end = this.completedAt || new Date();
		return end - this.startedAt;
	}
}

// =====================
// CLASSE QUEUE
// =====================

class AIQueue extends EventEmitter {
	constructor() {
		super();
		this.queue = [];
		this.processing = false;
		this.currentJob = null;
		this.stats = {
			totalProcessed: 0,
			totalFailed: 0,
			totalTime: 0,
		};
	}

	/**
	 * Ajoute un job à la queue
	 * @param {string} type - Type de job
	 * @param {Object} data - Données du job
	 * @param {number} priority - Priorité (optionnel)
	 * @returns {Promise} - Résolu quand le job est terminé
	 */
	async add(type, data, priority = PRIORITIES.NORMAL) {
		const job = new Job(type, data, priority);

		// Insérer le job dans la queue selon sa priorité
		const insertIndex = this.queue.findIndex((j) => j.priority > job.priority);
		if (insertIndex === -1) {
			this.queue.push(job);
		} else {
			this.queue.splice(insertIndex, 0, job);
		}

		console.log(
			`📥 Job ajouté à la queue: ${job.id} (type: ${job.type}, priority: ${job.priority})`
		);
		console.log(`📊 Taille de la queue: ${this.queue.length}`);

		// Démarrer le worker si pas déjà en cours
		if (!this.processing) {
			this.processQueue();
		}

		// Retourner une promesse qui se résoudra quand le job sera terminé
		return new Promise((resolve, reject) => {
			this.once(`job:${job.id}:completed`, (result) => resolve(result));
			this.once(`job:${job.id}:failed`, (error) => reject(error));
		});
	}

	/**
	 * Process la queue
	 */
	async processQueue() {
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;

		while (this.queue.length > 0) {
			const job = this.queue.shift();
			this.currentJob = job;

			console.log(`⚙️ Traitement du job: ${job.id} (type: ${job.type})`);

			try {
				job.status = "processing";
				job.startedAt = new Date();

				// Traiter le job avec timeout
				const timeout = JOB_TIMEOUTS[job.type] || 30000;
				const result = await Promise.race([
					this.executeJob(job),
					this.createTimeout(timeout),
				]);

				job.status = "completed";
				job.result = result;
				job.completedAt = new Date();

				this.stats.totalProcessed++;
				this.stats.totalTime += job.getDuration();

				console.log(
					`✅ Job terminé: ${job.id} (durée: ${job.getDuration()}ms)`
				);
				this.emit(`job:${job.id}:completed`, result);
			} catch (error) {
				job.status = "failed";
				job.error = error.message;
				job.completedAt = new Date();

				this.stats.totalFailed++;

				console.error(`❌ Job échoué: ${job.id}`, error.message);
				this.emit(`job:${job.id}:failed`, error);
			}

			this.currentJob = null;
		}

		this.processing = false;
		console.log(`✨ Queue vide, worker en attente`);
	}

	/**
	 * Exécute un job selon son type
	 * @param {Job} job - Job à exécuter
	 * @returns {Promise} - Résultat du job
	 */
	async executeJob(job) {
		// Cette fonction sera overridée par setExecutor
		throw new Error(`Pas d'executor défini pour le type: ${job.type}`);
	}

	/**
	 * Crée un timeout
	 * @param {number} ms - Durée en ms
	 * @returns {Promise} - Rejetée après le timeout
	 */
	createTimeout(ms) {
		return new Promise((_, reject) => {
			setTimeout(() => reject(new Error(`Job timeout après ${ms}ms`)), ms);
		});
	}

	/**
	 * Définit l'executor pour les jobs
	 * @param {Function} executor - Fonction async (job) => result
	 */
	setExecutor(executor) {
		this.executeJob = executor;
	}

	/**
	 * Retourne les statistiques
	 * @returns {Object} - Stats
	 */
	getStats() {
		return {
			...this.stats,
			queueSize: this.queue.length,
			currentJob: this.currentJob
				? {
						id: this.currentJob.id,
						type: this.currentJob.type,
						duration: this.currentJob.getDuration(),
				  }
				: null,
			averageTime:
				this.stats.totalProcessed > 0
					? (this.stats.totalTime / this.stats.totalProcessed).toFixed(2)
					: 0,
		};
	}

	/**
	 * Vide la queue (pour tests ou reset)
	 */
	clear() {
		this.queue = [];
		console.log("🗑️ Queue vidée");
	}
}

// =====================
// INSTANCE SINGLETON
// =====================

export const aiQueue = new AIQueue();
export { PRIORITIES };

// =====================
// FONCTIONS HELPER
// =====================

/**
 * Ajoute un job de génération de question
 * @param {Object} note - Note pour laquelle générer une question
 * @param {string} priority - Priorité (optionnel)
 * @returns {Promise} - Résultat du job
 */
export async function queueGenerateQuestion(
	note,
	priority = PRIORITIES.NORMAL
) {
	return aiQueue.add("generate-question", { note }, priority);
}

/**
 * Ajoute un job d'évaluation de réponse
 * @param {Object} data - { question, userAnswer, correctContext }
 * @param {string} priority - Priorité (optionnel)
 * @returns {Promise} - Résultat du job
 */
export async function queueEvaluateAnswer(data, priority = PRIORITIES.HIGH) {
	return aiQueue.add("evaluate-answer", data, priority);
}

/**
 * Ajoute un job de génération d'indice
 * @param {Object} note - Note pour laquelle générer un indice
 * @param {string} priority - Priorité (optionnel)
 * @returns {Promise} - Résultat du job
 */
export async function queueGenerateHint(note, priority = PRIORITIES.HIGH) {
	return aiQueue.add("generate-hint", { note }, priority);
}

/**
 * Ajoute un job de pré-génération
 * @param {Object} data - Données de pré-génération
 * @param {string} priority - Priorité (optionnel)
 * @returns {Promise} - Résultat du job
 */
export async function queuePreGenerate(data, priority = PRIORITIES.LOW) {
	return aiQueue.add("pre-generate", data, priority);
}
