import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as preGenerator from "./preGenerator.js";
import * as dataStore from "./dataStore.js";
import * as questionCache from "./questionCache.js";
import * as ai from "./ai.js";

/**
 * Tests unitaires pour le pré-générateur de questions
 *
 * Objectif : Vérifier que le système de pré-génération fonctionne correctement
 *
 * Cas testés :
 * 1. Pré-génération pour notes sans cache
 * 2. Utilisation du cache existant
 * 3. Gestion des erreurs et timeouts
 * 4. Configuration du pré-générateur
 * 5. Limites et quotas
 */

describe("preGenerator", () => {
	// Mock des dépendances
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("preGenerateForUpcomingSessions", () => {
		it("devrait retourner un rapport si la pré-génération est désactivée", async () => {
			// Désactiver temporairement
			const originalEnabled = process.env.PREGENERATE_ENABLED;
			process.env.PREGENERATE_ENABLED = "false";

			const report = await preGenerator.preGenerateForUpcomingSessions();

			expect(report.enabled).toBe(false);
			expect(report.summary.total).toBe(0);

			// Restaurer
			process.env.PREGENERATE_ENABLED = originalEnabled;
		});

		it("devrait utiliser le cache si une question existe déjà", async () => {
			// Mock des fonctions
			vi.spyOn(dataStore, "readNotes").mockResolvedValue([
				{
					id: 1,
					title: "Test",
					description: "Test description",
					intensity: "moderate",
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
			]);

			vi.spyOn(questionCache, "getCachedQuestion").mockResolvedValue({
				question: "Question en cache",
				model: "gpt-oss",
				generatedAt: new Date().toISOString(),
			});

			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["moderate"],
			});

			expect(report.enabled).toBe(true);
			expect(report.summary.cached).toBeGreaterThan(0);
			expect(report.summary.generated).toBe(0);
		});

		it("devrait générer des questions pour notes sans cache", async () => {
			// Mock des fonctions
			vi.spyOn(dataStore, "readNotes").mockResolvedValue([
				{
					id: 2,
					title: "Test",
					description: "Test description",
					intensity: "moderate",
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
			]);

			vi.spyOn(questionCache, "getCachedQuestion").mockResolvedValue(null);

			// generateQuestion retourne maintenant {question, model}
			vi.spyOn(ai, "generateQuestion").mockResolvedValue({
				question: "Question générée par IA",
				model: "gpt-oss",
			});

			vi.spyOn(ai, "pickModelForTask").mockReturnValue("gpt-oss");

			vi.spyOn(questionCache, "cacheQuestion").mockResolvedValue(undefined);

			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["moderate"],
			});

			expect(report.enabled).toBe(true);
			expect(report.summary.generated).toBeGreaterThan(0);
			expect(ai.generateQuestion).toHaveBeenCalled();
			expect(questionCache.cacheQuestion).toHaveBeenCalled();
		});

		it("devrait gérer les erreurs de génération", async () => {
			// Mock des fonctions
			vi.spyOn(dataStore, "readNotes").mockResolvedValue([
				{
					id: 3,
					title: "Test",
					description: "Test description",
					intensity: "moderate",
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
			]);

			vi.spyOn(questionCache, "getCachedQuestion").mockResolvedValue(null);

			vi.spyOn(ai, "generateQuestion").mockRejectedValue(
				new Error("Erreur IA")
			);

			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["moderate"],
			});

			expect(report.enabled).toBe(true);
			expect(report.summary.failed).toBeGreaterThan(0);
		});

		it("devrait respecter la limite maxQuestions", async () => {
			// Mock avec 10 notes
			const notes = Array.from({ length: 10 }, (_, i) => ({
				id: i + 1,
				title: `Test ${i + 1}`,
				description: "Test description",
				intensity: "moderate",
				createdAt: new Date().toISOString(),
				reviewCount: 0,
				lastReviewed: null,
			}));

			vi.spyOn(dataStore, "readNotes").mockResolvedValue(notes);
			vi.spyOn(questionCache, "getCachedQuestion").mockResolvedValue(null);
			// generateQuestion retourne maintenant {question, model}
			vi.spyOn(ai, "generateQuestion").mockResolvedValue({
				question: "Question test",
				model: "gpt-oss",
			});
			vi.spyOn(ai, "pickModelForTask").mockReturnValue("gpt-oss");
			vi.spyOn(questionCache, "cacheQuestion").mockResolvedValue(undefined);

			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["moderate"],
				maxQuestions: 5,
			});

			expect(report.summary.total).toBeLessThanOrEqual(5);
		});

		it("devrait traiter plusieurs intensités", async () => {
			// Mock avec notes de différentes intensités
			const notes = [
				{
					id: 1,
					title: "Chill",
					description: "Test",
					intensity: "chill",
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
				{
					id: 2,
					title: "Moderate",
					description: "Test",
					intensity: "moderate",
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
			];

			vi.spyOn(dataStore, "readNotes").mockResolvedValue(notes);
			vi.spyOn(questionCache, "getCachedQuestion").mockResolvedValue(null);
			// generateQuestion retourne maintenant {question, model}
			vi.spyOn(ai, "generateQuestion").mockResolvedValue({
				question: "Question test",
				model: "gpt-oss",
			});
			vi.spyOn(ai, "pickModelForTask").mockReturnValue("gpt-oss");
			vi.spyOn(questionCache, "cacheQuestion").mockResolvedValue(undefined);

			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["chill", "moderate"],
			});

			expect(report.summary.total).toBe(2);
		});
	});

	describe("getPreGeneratorConfig", () => {
		it("devrait retourner la configuration actuelle", () => {
			const config = preGenerator.getPreGeneratorConfig();

			expect(config).toHaveProperty("intensities");
			expect(config).toHaveProperty("questionTimeout");
			expect(config).toHaveProperty("maxQuestionsPerRun");
			expect(config).toHaveProperty("enabled");
		});
	});

	describe("updatePreGeneratorConfig", () => {
		it("devrait mettre à jour la configuration", () => {
			const newConfig = {
				maxQuestionsPerRun: 50,
				questionTimeout: 60000,
			};

			preGenerator.updatePreGeneratorConfig(newConfig);
			const config = preGenerator.getPreGeneratorConfig();

			expect(config.maxQuestionsPerRun).toBe(50);
			expect(config.questionTimeout).toBe(60000);
		});

		it("devrait ignorer les valeurs invalides", () => {
			const originalConfig = preGenerator.getPreGeneratorConfig();

			preGenerator.updatePreGeneratorConfig({
				maxQuestionsPerRun: "invalid", // Invalide
			});

			const config = preGenerator.getPreGeneratorConfig();
			expect(config.maxQuestionsPerRun).toBe(originalConfig.maxQuestionsPerRun);
		});
	});
});
