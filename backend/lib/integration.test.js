import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
	vi,
} from "vitest";
import * as dataStore from "./dataStore.js";
import * as sessionScheduler from "./sessionScheduler.js";
import * as questionCache from "./questionCache.js";
import * as preGenerator from "./preGenerator.js";
import * as ai from "./ai.js";

/**
 * Tests d'intégration
 *
 * Teste le workflow complet de l'application :
 * 1. Création d'une note
 * 2. Pré-génération de questions
 * 3. Récupération depuis le cache
 * 4. Affichage de la carte (simulation)
 * 5. Workflow de session complète
 */

// Mock Ollama pour éviter les appels réels - doit être une classe
vi.mock("ollama", () => {
	return {
		Ollama: class MockOllama {
			async generate() {
				return {
					response: "Question générée par mock",
				};
			}
		},
	};
});

describe("Tests d'intégration - Workflow complet", () => {
	let testNoteId;

	beforeEach(() => {
		// Reset des métriques
		questionCache.resetCacheMetrics();
		vi.clearAllMocks();
	});

	describe("Workflow 1 : Création note → Pré-génération → Cache", () => {
		it("devrait créer une note et pré-générer sa question", async () => {
			// 1. Créer une note
			const notes = await dataStore.readNotes();
			const newNote = {
				id: Date.now(),
				title: "Test Integration",
				description: "Quelle est la capitale de la France ?",
				intensity: "intensive",
				aiTags: [],
				createdAt: new Date().toISOString(),
				reviewCount: 0,
				lastReviewed: null,
			};

			notes.push(newNote);
			await dataStore.writeNotes(notes);
			testNoteId = newNote.id;

			// 2. Vérifier que la note est créée
			const allNotes = await dataStore.readNotes();
			const createdNote = allNotes.find((n) => n.id === testNoteId);
			expect(createdNote).toBeDefined();
			expect(createdNote.title).toBe("Test Integration");

			// 3. Vérifier qu'il n'y a pas de question en cache
			const cachedBefore = await questionCache.getCachedQuestion(testNoteId);
			expect(cachedBefore).toBeNull();

			// 4. Pré-générer les questions
			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["intensive"],
				maxQuestions: 5,
			});

			// 5. Vérifier que la pré-génération a réussi
			expect(report.enabled).toBe(true);
			expect(report.summary.total).toBeGreaterThan(0);

			// 6. Vérifier que la question est maintenant en cache
			const cachedAfter = await questionCache.getCachedQuestion(testNoteId);
			expect(cachedAfter).not.toBeNull();
			expect(cachedAfter.question).toBeDefined();
			expect(cachedAfter.model).toBeDefined();
		}, 30000); // Timeout de 30s pour l'IA

		it("devrait utiliser le cache lors du second accès", async () => {
			// 1. Première génération (mise en cache)
			const notes = await dataStore.readNotes();
			const noteWithCache = notes.find((n) => n.intensity === "intensive");

			if (!noteWithCache) {
				console.warn("Aucune note intensive trouvée, skip du test");
				return;
			}

			// Générer et mettre en cache
			const { question, model } = await ai.generateQuestion(noteWithCache);
			await questionCache.cacheQuestion(noteWithCache.id, question, model);
			questionCache.recordGeneration();

			// 2. Second accès (depuis cache)
			const cached = await questionCache.getCachedQuestion(noteWithCache.id);

			if (cached) {
				questionCache.recordCacheHit();
			} else {
				questionCache.recordCacheMiss();
			}

			// 3. Vérifier les métriques
			const metrics = questionCache.getCacheMetrics();
			expect(metrics.hits).toBe(1);
			expect(metrics.misses).toBe(0);
			expect(metrics.hitRate).toBe(100);
		}, 30000);
	});

	describe("Workflow 2 : Session complète", () => {
		it("devrait gérer une session complète (création → pré-gen → affichage)", async () => {
			// 1. Créer plusieurs notes avec différentes intensités
			const notes = await dataStore.readNotes();
			const sessionNotes = [
				{
					id: Date.now(),
					title: "Note Intensive 1",
					description: "Description 1",
					intensity: "intensive",
					aiTags: [],
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
				{
					id: Date.now() + 1,
					title: "Note Moderate 1",
					description: "Description 2",
					intensity: "moderate",
					aiTags: [],
					createdAt: new Date().toISOString(),
					reviewCount: 0,
					lastReviewed: null,
				},
			];

			await dataStore.writeNotes([...notes, ...sessionNotes]);

			// 2. Vérifier qu'une session intensive est active (mode soon)
			const isActive = sessionScheduler.isSessionActive("intensive");
			console.log(`Session intensive active: ${isActive}`);

			// 3. Récupérer les notes de session
			const allNotes = await dataStore.readNotes();
			const intensiveNotes = sessionScheduler.getSessionNotes(
				allNotes,
				"intensive"
			);
			expect(intensiveNotes.length).toBeGreaterThan(0);

			// 4. Pré-générer pour cette session
			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: ["intensive"],
			});

			expect(report.summary.total).toBeGreaterThan(0);

			// 5. Simuler l'affichage d'une carte (vérifier cache)
			const firstNote = intensiveNotes[0];
			const cached = await questionCache.getCachedQuestion(firstNote.id);

			// La question devrait être en cache après pré-génération
			expect(cached).not.toBeNull();
		}, 30000);

		it("devrait prioriser les notes jamais révisées", async () => {
			// 1. Créer des notes avec différents états de révision
			const notes = await dataStore.readNotes();
			const reviewedNote = {
				id: Date.now(),
				title: "Note révisée",
				description: "Déjà vue",
				intensity: "moderate",
				createdAt: new Date(Date.now() - 10000).toISOString(),
				reviewCount: 3,
				lastReviewed: new Date(Date.now() - 1000).toISOString(),
			};

			const newNote = {
				id: Date.now() + 1,
				title: "Note jamais révisée",
				description: "Jamais vue",
				intensity: "moderate",
				createdAt: new Date().toISOString(),
				reviewCount: 0,
				lastReviewed: null,
			};

			await dataStore.writeNotes([...notes, reviewedNote, newNote]);

			// 2. Sélectionner la note prioritaire
			const allNotes = await dataStore.readNotes();
			const moderateNotes = allNotes.filter((n) => n.intensity === "moderate");
			const priorityNote = sessionScheduler.selectPriorityNote(moderateNotes);

			// 3. La note jamais révisée devrait être prioritaire
			expect(priorityNote).toBeDefined();
			expect(priorityNote.lastReviewed).toBeNull();
		});
	});

	describe("Workflow 3 : Gestion du cache avec expiration", () => {
		it("devrait gérer l'expiration et la régénération", async () => {
			const notes = await dataStore.readNotes();
			const testNote = notes[0];

			if (!testNote) {
				console.warn("Aucune note disponible, skip du test");
				return;
			}

			// 1. Mettre en cache avec TTL très court
			await questionCache.cacheQuestion(
				testNote.id,
				"Question temporaire",
				"gpt-oss",
				{ ttl: 100 } // 100ms
			);

			// 2. Vérifier que la question est en cache
			const cached1 = await questionCache.getCachedQuestion(testNote.id);
			expect(cached1).not.toBeNull();

			// 3. Attendre l'expiration
			await new Promise((resolve) => setTimeout(resolve, 150));

			// 4. Vérifier que la question est expirée
			const cached2 = await questionCache.getCachedQuestion(testNote.id);
			expect(cached2).toBeNull();

			// 5. Nettoyer le cache expiré
			const removedCount = await questionCache.cleanExpiredCache();
			expect(removedCount).toBeGreaterThan(0);

			// 6. Régénérer
			const { question, model } = await ai.generateQuestion(testNote);
			await questionCache.cacheQuestion(testNote.id, question, model);

			// 7. Vérifier que la nouvelle question est en cache
			const cached3 = await questionCache.getCachedQuestion(testNote.id);
			expect(cached3).not.toBeNull();
			expect(cached3.question).toBe(question);
		}, 30000);
	});

	describe("Workflow 4 : Sessions à venir et anticipation", () => {
		it("devrait identifier les sessions à venir dans les prochaines 24h", async () => {
			const notes = await dataStore.readNotes();
			const lookahead = 24 * 60 * 60 * 1000; // 24h

			// Récupérer toutes les sessions à venir
			const upcomingSessions = sessionScheduler.getAllUpcomingSessions(
				notes,
				lookahead
			);

			// Vérifier la structure
			expect(Array.isArray(upcomingSessions)).toBe(true);
			upcomingSessions.forEach((session) => {
				expect(session).toHaveProperty("intensity");
				expect(session).toHaveProperty("nextSession");
				expect(session).toHaveProperty("notes");
				expect(session).toHaveProperty("timeUntil");
				expect(session).toHaveProperty("withinLookahead");
			});
		});

		it("devrait pré-générer pour les sessions imminentes", async () => {
			const notes = await dataStore.readNotes();

			// Identifier les sessions dans les 2h
			const upcomingSessions = sessionScheduler.getAllUpcomingSessions(
				notes,
				2 * 60 * 60 * 1000
			);

			if (upcomingSessions.length === 0) {
				console.warn("Aucune session imminente, skip du test");
				return;
			}

			// Pré-générer pour la session la plus proche
			const nextSession = upcomingSessions[0];
			const report = await preGenerator.preGenerateForUpcomingSessions({
				intensities: [nextSession.intensity],
				maxQuestions: 3,
			});

			expect(report.summary.generated).toBeGreaterThanOrEqual(0);
		}, 30000);
	});

	describe("Workflow 5 : Sélection intelligente du modèle", () => {
		it("devrait utiliser le bon modèle selon le contenu", async () => {
			// Note avec du code
			const codeNote = {
				id: Date.now(),
				title: "JavaScript",
				description: "Comment utiliser la fonction map() en JavaScript ?",
				intensity: "moderate",
			};

			// Note générale
			const generalNote = {
				id: Date.now() + 1,
				title: "Histoire",
				description: "Qui était Napoléon Bonaparte ?",
				intensity: "moderate",
			};

			// Vérifier la sélection du modèle
			const codeModel = ai.pickModelForTask(codeNote, "generation");
			const generalModel = ai.pickModelForTask(generalNote, "generation");

			expect(codeModel).toBe("hir0rameel/qwen-claude");
			expect(generalModel).toBe("gpt-oss");

			// Pour evaluation et hint : toujours léger
			expect(ai.pickModelForTask(codeNote, "evaluation")).toBe("gpt-oss");
			expect(ai.pickModelForTask(codeNote, "hint")).toBe("gpt-oss");
		});
	});

	describe("Workflow 6 : Métriques et performance", () => {
		it("devrait suivre les métriques de cache sur plusieurs opérations", async () => {
			questionCache.resetCacheMetrics();
			const notes = await dataStore.readNotes();

			if (notes.length < 2) {
				console.warn("Pas assez de notes pour le test de métriques");
				return;
			}

			// Simuler plusieurs accès
			for (let i = 0; i < 3; i++) {
				const note = notes[i % notes.length];
				const cached = await questionCache.getCachedQuestion(note.id);

				if (cached) {
					questionCache.recordCacheHit();
				} else {
					questionCache.recordCacheMiss();
					const { question, model } = await ai.generateQuestion(note);
					await questionCache.cacheQuestion(note.id, question, model);
					questionCache.recordGeneration();
				}
			}

			// Vérifier les métriques
			const metrics = questionCache.getCacheMetrics();
			expect(metrics.totalRequests).toBe(3);
			expect(metrics.hits + metrics.misses).toBe(3);
			expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
			expect(metrics.hitRate).toBeLessThanOrEqual(100);
		}, 30000);

		it("devrait afficher les statistiques du cache", async () => {
			const stats = await questionCache.getCacheStats();

			expect(stats).toHaveProperty("totalEntries");
			expect(stats).toHaveProperty("validEntries");
			expect(stats).toHaveProperty("expiredEntries");
			expect(stats).toHaveProperty("ttlDays");

			expect(typeof stats.totalEntries).toBe("number");
			expect(typeof stats.validEntries).toBe("number");
			expect(typeof stats.expiredEntries).toBe("number");
		});
	});
});
