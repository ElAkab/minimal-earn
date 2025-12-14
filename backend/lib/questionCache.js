import * as dataStore from "./dataStore.js";

/**
 * TTL par défaut pour les questions en cache (7 jours en millisecondes)
 * Peut être configuré via config.json (questionCacheTTLDays) ou variable d'environnement QUESTION_CACHE_TTL_MS
 */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Récupère le TTL configuré
 * Priorité : env var > config.json > défaut
 * @returns {Promise<number>} - TTL en millisecondes
 */
async function getTTL() {
	// Vérifier env var en priorité
	if (process.env.QUESTION_CACHE_TTL_MS) {
		const envTTL = parseInt(process.env.QUESTION_CACHE_TTL_MS);
		if (!isNaN(envTTL) && envTTL > 0) {
			return envTTL;
		}
	}

	// Sinon utiliser config.json
	try {
		return await dataStore.getCacheTTL();
	} catch (err) {
		console.warn(
			"⚠️ Erreur lecture TTL depuis config, utilisation valeur par défaut"
		);
		return DEFAULT_TTL_MS;
	}
}

// Afficher la configuration au démarrage
getTTL()
	.then((ttl) => {
		console.log(
			`⚙️ Configuration du cache de questions: TTL = ${
				ttl / (24 * 60 * 60 * 1000)
			} jours`
		);
	})
	.catch(() => {
		console.log(
			`⚙️ Configuration du cache de questions: TTL = ${
				DEFAULT_TTL_MS / (24 * 60 * 60 * 1000)
			} jours (défaut)`
		);
	});

// =====================
// Fonctions publiques
// =====================

/**
 * Met en cache une question générée pour une note
 * @param {number} noteId - ID de la note
 * @param {string} question - Question générée par l'IA
 * @param {string} model - Nom du modèle IA utilisé
 * @param {Object} [options] - Options { ttl?: number }
 * @returns {Promise<void>}
 *
 * @example
 * await cacheQuestion(123, "Quelle est la capitale de la France ?", "gpt-oss");
 * await cacheQuestion(123, "Question", "gpt-oss", { ttl: 86400000 }); // 1 jour custom
 */
export async function cacheQuestion(noteId, question, model, options = {}) {
	if (!noteId || typeof noteId !== "number") {
		throw new TypeError("noteId must be a number");
	}
	if (!question || typeof question !== "string") {
		throw new TypeError("question must be a non-empty string");
	}
	if (!model || typeof model !== "string") {
		throw new TypeError("model must be a non-empty string");
	}

	const cache = await dataStore.readQuestionCache();
	const now = Date.now();
	const ttl = options.ttl || (await getTTL());

	cache[noteId] = {
		question,
		model,
		generatedAt: new Date(now).toISOString(),
		expiresAt: new Date(now + ttl).toISOString(),
		_expiresAtTimestamp: now + ttl, // Pour faciliter les comparaisons
	};

	await dataStore.writeQuestionCache(cache);
	console.log(
		`✅ Question mise en cache pour note ${noteId} (expire: ${cache[noteId].expiresAt})`
	);
}

/**
 * Récupère une question en cache pour une note (si elle existe et n'est pas expirée)
 * @param {number} noteId - ID de la note
 * @returns {Promise<Object|null>} - Objet { question, model, generatedAt } ou null si pas en cache/expiré
 *
 * @example
 * const cached = await getCachedQuestion(123);
 * if (cached) {
 *   console.log(cached.question);
 * }
 */
export async function getCachedQuestion(noteId) {
	if (!noteId || typeof noteId !== "number") {
		throw new TypeError("noteId must be a number");
	}

	const cache = await dataStore.readQuestionCache();
	const entry = cache[noteId];

	if (!entry) {
		console.log(`🔍 Aucune question en cache pour note ${noteId}`);
		return null;
	}

	const now = Date.now();
	const expiresAt =
		entry._expiresAtTimestamp || new Date(entry.expiresAt).getTime();

	if (now > expiresAt) {
		console.log(
			`⏰ Question en cache expirée pour note ${noteId} (expirée depuis: ${new Date(
				expiresAt
			).toISOString()})`
		);
		// Nettoyer automatiquement l'entrée expirée
		await invalidateCache(noteId);
		return null;
	}

	console.log(
		`✅ Question trouvée en cache pour note ${noteId} (généré: ${entry.generatedAt})`
	);
	return {
		question: entry.question,
		model: entry.model,
		generatedAt: entry.generatedAt,
	};
}

/**
 * Invalide le cache pour une note spécifique
 * @param {number} noteId - ID de la note
 * @returns {Promise<boolean>} - true si le cache a été invalidé, false si aucun cache n'existait
 *
 * @example
 * await invalidateCache(123); // Supprime le cache pour la note 123
 */
export async function invalidateCache(noteId) {
	if (!noteId || typeof noteId !== "number") {
		throw new TypeError("noteId must be a number");
	}

	const cache = await dataStore.readQuestionCache();

	if (!cache[noteId]) {
		console.log(`⚠️ Aucun cache à invalider pour note ${noteId}`);
		return false;
	}

	delete cache[noteId];
	await dataStore.writeQuestionCache(cache);
	console.log(`🗑️ Cache invalidé pour note ${noteId}`);
	return true;
}

/**
 * Nettoie toutes les entrées de cache expirées
 * @returns {Promise<number>} - Nombre d'entrées supprimées
 *
 * @example
 * const removed = await cleanExpiredCache();
 * console.log(`${removed} questions expirées supprimées du cache`);
 */
export async function cleanExpiredCache() {
	const cache = await dataStore.readQuestionCache();
	const now = Date.now();
	let removedCount = 0;

	const noteIds = Object.keys(cache);

	for (const noteId of noteIds) {
		const entry = cache[noteId];
		const expiresAt =
			entry._expiresAtTimestamp || new Date(entry.expiresAt).getTime();

		if (now > expiresAt) {
			delete cache[noteId];
			removedCount++;
			console.log(`🗑️ Cache expiré supprimé pour note ${noteId}`);
		}
	}

	if (removedCount > 0) {
		await dataStore.writeQuestionCache(cache);
		console.log(
			`✅ ${removedCount} entrée(s) de cache expirée(s) supprimée(s)`
		);
	} else {
		console.log(`✨ Aucune entrée de cache expirée trouvée`);
	}

	return removedCount;
}

/**
 * Récupère les statistiques du cache
 * @returns {Promise<Object>} - { totalEntries, expiredEntries, validEntries }
 *
 * @example
 * const stats = await getCacheStats();
 * console.log(`Cache: ${stats.validEntries} valides, ${stats.expiredEntries} expirées`);
 */
export async function getCacheStats() {
	const cache = await dataStore.readQuestionCache();
	const now = Date.now();

	const totalEntries = Object.keys(cache).length;
	let expiredEntries = 0;
	let validEntries = 0;

	for (const noteId in cache) {
		const entry = cache[noteId];
		const expiresAt =
			entry._expiresAtTimestamp || new Date(entry.expiresAt).getTime();

		if (now > expiresAt) {
			expiredEntries++;
		} else {
			validEntries++;
		}
	}

	const ttl = await getTTL();

	return {
		totalEntries,
		expiredEntries,
		validEntries,
		ttlDays: ttl / (24 * 60 * 60 * 1000),
	};
}

// =====================
// Métriques de cache (hit/miss tracking)
// =====================

/**
 * Compteurs de métriques (stockés en mémoire, réinitialisés au redémarrage du serveur)
 * Pour une persistance entre redémarrages, ces données pourraient être stockées dans un fichier JSON
 */
const cacheMetrics = {
	hits: 0, // Nombre de fois où une question a été trouvée en cache
	misses: 0, // Nombre de fois où une question n'était pas en cache
	generations: 0, // Nombre de nouvelles questions générées
};

/**
 * Enregistre un cache hit (question trouvée en cache)
 */
export function recordCacheHit() {
	cacheMetrics.hits++;
}

/**
 * Enregistre un cache miss (question non trouvée en cache)
 */
export function recordCacheMiss() {
	cacheMetrics.misses++;
}

/**
 * Enregistre une génération de question
 */
export function recordGeneration() {
	cacheMetrics.generations++;
}

/**
 * Récupère les métriques de cache hit/miss
 * @returns {Object} - { hits, misses, generations, hitRate, totalRequests }
 *
 * @example
 * const metrics = getCacheMetrics();
 * console.log(`Taux de cache hit: ${metrics.hitRate}%`);
 */
export function getCacheMetrics() {
	const totalRequests = cacheMetrics.hits + cacheMetrics.misses;
	const hitRate =
		totalRequests > 0
			? ((cacheMetrics.hits / totalRequests) * 100).toFixed(2)
			: "0.00";

	return {
		hits: cacheMetrics.hits,
		misses: cacheMetrics.misses,
		generations: cacheMetrics.generations,
		totalRequests,
		hitRate: parseFloat(hitRate),
	};
}

/**
 * Réinitialise les métriques de cache
 */
export function resetCacheMetrics() {
	cacheMetrics.hits = 0;
	cacheMetrics.misses = 0;
	cacheMetrics.generations = 0;
	console.log("📊 Métriques de cache réinitialisées");
}
