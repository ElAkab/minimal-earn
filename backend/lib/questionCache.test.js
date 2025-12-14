import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
	cacheQuestion,
	getCachedQuestion,
	invalidateCache,
	cleanExpiredCache,
	getCacheStats,
	recordCacheHit,
	recordCacheMiss,
	recordGeneration,
	getCacheMetrics,
	resetCacheMetrics,
} from "./questionCache.js";

const __filename = import.meta.filename;
const __dirname = path.dirname(__filename);
const TEST_CACHE_FILE = path.join(
	__dirname,
	"..",
	"data",
	"questionCache.json"
);

/**
 * Tests unitaires pour le système de cache de questions
 *
 * Objectif : Vérifier que le cache fonctionne correctement
 *
 * Cas testés :
 * 1. Mise en cache d'une question
 * 2. Récupération d'une question en cache
 * 3. Expiration du cache
 * 4. Invalidation du cache
 * 5. Nettoyage des entrées expirées
 * 6. Statistiques du cache
 */

describe("questionCache", () => {
	// Nettoyer le cache avant chaque test
	beforeEach(async () => {
		try {
			await fs.promises.writeFile(TEST_CACHE_FILE, JSON.stringify({}), "utf8");
		} catch (err) {
			// Ignorer si le fichier n'existe pas
		}
	});

	describe("cacheQuestion", () => {
		it("devrait mettre en cache une question", async () => {
			await cacheQuestion(123, "Quelle est la capitale ?", "gpt-oss");

			const cached = await getCachedQuestion(123);
			expect(cached).toBeTruthy();
			expect(cached.question).toBe("Quelle est la capitale ?");
			expect(cached.model).toBe("gpt-oss");
		});

		it("devrait gérer les erreurs de validation", async () => {
			await expect(cacheQuestion(null, "Question", "model")).rejects.toThrow();
			await expect(cacheQuestion(123, null, "model")).rejects.toThrow();
			await expect(cacheQuestion(123, "Question", null)).rejects.toThrow();
		});

		it("devrait remplacer une question existante en cache", async () => {
			await cacheQuestion(123, "Ancienne question", "gpt-oss");
			await cacheQuestion(123, "Nouvelle question", "gpt-oss");

			const cached = await getCachedQuestion(123);
			expect(cached.question).toBe("Nouvelle question");
		});
	});

	describe("getCachedQuestion", () => {
		it("devrait retourner null si aucune question en cache", async () => {
			const cached = await getCachedQuestion(999);
			expect(cached).toBeNull();
		});

		it("devrait retourner la question si elle existe et n'est pas expirée", async () => {
			await cacheQuestion(123, "Question test", "gpt-oss");

			const cached = await getCachedQuestion(123);
			expect(cached).toBeTruthy();
			expect(cached.question).toBe("Question test");
			expect(cached.model).toBe("gpt-oss");
			expect(cached.generatedAt).toBeTruthy();
		});

		it("devrait retourner null si la question est expirée", async () => {
			// Mettre en cache avec un TTL de 1ms
			await cacheQuestion(123, "Question test", "gpt-oss", { ttl: 1 });

			// Attendre que le cache expire
			await new Promise((resolve) => setTimeout(resolve, 10));

			const cached = await getCachedQuestion(123);
			expect(cached).toBeNull();
		});

		it("devrait gérer les erreurs de validation", async () => {
			await expect(getCachedQuestion(null)).rejects.toThrow();
			await expect(getCachedQuestion("invalid")).rejects.toThrow();
		});
	});

	describe("invalidateCache", () => {
		it("devrait invalider le cache pour une note", async () => {
			await cacheQuestion(123, "Question test", "gpt-oss");

			const invalidated = await invalidateCache(123);
			expect(invalidated).toBe(true);

			const cached = await getCachedQuestion(123);
			expect(cached).toBeNull();
		});

		it("devrait retourner false si aucun cache n'existe", async () => {
			const invalidated = await invalidateCache(999);
			expect(invalidated).toBe(false);
		});

		it("devrait gérer les erreurs de validation", async () => {
			await expect(invalidateCache(null)).rejects.toThrow();
			await expect(invalidateCache("invalid")).rejects.toThrow();
		});
	});

	describe("cleanExpiredCache", () => {
		it("devrait nettoyer les entrées expirées", async () => {
			// Mettre en cache 2 questions, une expirée, une valide
			await cacheQuestion(123, "Question expirée", "gpt-oss", { ttl: 1 });
			await cacheQuestion(456, "Question valide", "gpt-oss", { ttl: 10000 });

			// Attendre que la première expire
			await new Promise((resolve) => setTimeout(resolve, 10));

			const removedCount = await cleanExpiredCache();
			expect(removedCount).toBe(1);

			// Vérifier que seule la question valide reste
			const cached123 = await getCachedQuestion(123);
			const cached456 = await getCachedQuestion(456);

			expect(cached123).toBeNull();
			expect(cached456).toBeTruthy();
		});

		it("devrait retourner 0 si aucune entrée n'est expirée", async () => {
			await cacheQuestion(123, "Question valide", "gpt-oss");

			const removedCount = await cleanExpiredCache();
			expect(removedCount).toBe(0);
		});

		it("devrait fonctionner avec un cache vide", async () => {
			const removedCount = await cleanExpiredCache();
			expect(removedCount).toBe(0);
		});
	});

	describe("getCacheStats", () => {
		it("devrait retourner les statistiques du cache", async () => {
			await cacheQuestion(123, "Question 1", "gpt-oss");
			await cacheQuestion(456, "Question 2", "gpt-oss");

			const stats = await getCacheStats();

			expect(stats.totalEntries).toBe(2);
			expect(stats.validEntries).toBe(2);
			expect(stats.expiredEntries).toBe(0);
			expect(stats.ttlDays).toBeGreaterThan(0);
		});

		it("devrait compter les entrées expirées", async () => {
			// Mettre en cache 1 question expirée, 1 valide
			await cacheQuestion(123, "Question expirée", "gpt-oss", { ttl: 1 });
			await cacheQuestion(456, "Question valide", "gpt-oss", { ttl: 10000 });

			// Attendre que la première expire
			await new Promise((resolve) => setTimeout(resolve, 10));

			const stats = await getCacheStats();

			expect(stats.totalEntries).toBe(2);
			expect(stats.validEntries).toBe(1);
			expect(stats.expiredEntries).toBe(1);
		});

		it("devrait fonctionner avec un cache vide", async () => {
			const stats = await getCacheStats();

			expect(stats.totalEntries).toBe(0);
			expect(stats.validEntries).toBe(0);
			expect(stats.expiredEntries).toBe(0);
		});
	});

	describe("intégration complète", () => {
		it("devrait gérer un workflow complet de cache", async () => {
			// 1. Mettre en cache une question
			await cacheQuestion(123, "Question test", "gpt-oss");

			// 2. Récupérer la question
			let cached = await getCachedQuestion(123);
			expect(cached).toBeTruthy();
			expect(cached.question).toBe("Question test");

			// 3. Vérifier les stats
			let stats = await getCacheStats();
			expect(stats.totalEntries).toBe(1);
			expect(stats.validEntries).toBe(1);

			// 4. Invalider le cache
			await invalidateCache(123);

			// 5. Vérifier que le cache est vide
			cached = await getCachedQuestion(123);
			expect(cached).toBeNull();

			// 6. Vérifier les stats finales
			stats = await getCacheStats();
			expect(stats.totalEntries).toBe(0);
		});
	});

	describe("Métriques de cache (hit/miss)", () => {
		beforeEach(() => {
			// Réinitialiser les métriques avant chaque test
			resetCacheMetrics();
		});

		it("devrait enregistrer un cache hit", () => {
			recordCacheHit();
			const metrics = getCacheMetrics();

			expect(metrics.hits).toBe(1);
			expect(metrics.misses).toBe(0);
			expect(metrics.totalRequests).toBe(1);
			expect(metrics.hitRate).toBe(100);
		});

		it("devrait enregistrer un cache miss", () => {
			recordCacheMiss();
			const metrics = getCacheMetrics();

			expect(metrics.hits).toBe(0);
			expect(metrics.misses).toBe(1);
			expect(metrics.totalRequests).toBe(1);
			expect(metrics.hitRate).toBe(0);
		});

		it("devrait calculer le taux de hits correctement", () => {
			// 3 hits, 1 miss = 75% hit rate
			recordCacheHit();
			recordCacheHit();
			recordCacheHit();
			recordCacheMiss();

			const metrics = getCacheMetrics();

			expect(metrics.hits).toBe(3);
			expect(metrics.misses).toBe(1);
			expect(metrics.totalRequests).toBe(4);
			expect(metrics.hitRate).toBe(75);
		});

		it("devrait enregistrer les générations", () => {
			recordGeneration();
			recordGeneration();

			const metrics = getCacheMetrics();

		it("devrait réinitialiser les métriques", () => {
			recordCacheHit();
			recordCacheMiss();
			recordGeneration();
			
			resetCacheMetrics();
			
			const metrics = getCacheMetrics();
			
			expect(metrics.hits).toBe(0);
			expect(metrics.misses).toBe(0);
			expect(metrics.generations).toBe(0);
			expect(metrics.totalRequests).toBe(0);
			expect(metrics.hitRate).toBe(0);
		});

		it("devrait gérer un taux de 0 requêtes", () => {
			const metrics = getCacheMetrics();
			
			expect(metrics.totalRequests).toBe(0);
			expect(metrics.hitRate).toBe(0);
		});

		it("devrait simuler un workflow réaliste", () => {
			// Simuler plusieurs requêtes avec différents résultats
			
			// Première requête : miss, puis génération
			recordCacheMiss();
			recordGeneration();
			
			// Deuxième requête : hit (même note)
			recordCacheHit();
			
			// Troisième requête : miss, puis génération
			recordCacheMiss();
			recordGeneration();
			
			// Quatrième requête : hit
			recordCacheHit();
			
			// Cinquième requête : hit
			recordCacheHit();
			
			const metrics = getCacheMetrics();
			
			expect(metrics.hits).toBe(3);
			expect(metrics.misses).toBe(2);
			expect(metrics.generations).toBe(2);
			expect(metrics.totalRequests).toBe(5);
			expect(metrics.hitRate).toBe(60); // 3/5 = 60%
		});
	});
});
