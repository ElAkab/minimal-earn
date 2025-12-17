import { describe, it, expect } from "vitest";
import { calculateNextReview } from "../../src/core/scheduler.js";

describe("calculateNextReview - Algorithme SM-2", () => {
	describe("Mauvaises réponses (score < 3)", () => {
		it("devrait réinitialiser l'intervalle à 1 jour avec un score de 0", () => {
			// Initialisation : une carte avec un score de 0, un intervalle actuel de 15 jours, et un easeFactor de 2.5
			const result = calculateNextReview(0, 15, 2.5);

			// Vérifications : l'intervalle doit être réinitialisé à 1 jour, et l'easeFactor doit diminuer
			expect(result.interval).toBe(1);
			expect(result.easeFactor).toBeLessThan(2.5);
			expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
		});

		it.only("devrait réinitialiser l'intervalle à 1 jour avec un score de 2", () => {
			const result = calculateNextReview(2, 30, 2.2);

			expect(result.interval).toBe(1);
			expect(result.easeFactor).toBeLessThan(2.2);
		});

		it("ne devrait pas descendre l'easeFactor en dessous de 1.3", () => {
			// Test avec un easeFactor déjà faible
			const result = calculateNextReview(1, 5, 1.3);

			expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
		});
	});

	describe("Bonnes réponses (score >= 3)", () => {
		it("devrait passer à 1 jour pour la première révision (interval = 0)", () => {
			const result = calculateNextReview(3, 0, 2.5);

			expect(result.interval).toBe(1);
			expect(result.easeFactor).toBeGreaterThan(0);
		});

		it("devrait passer à 6 jours pour la deuxième révision (interval = 1)", () => {
			const result = calculateNextReview(4, 1, 2.5);

			expect(result.interval).toBe(6);
			expect(result.easeFactor).toBeGreaterThan(0);
		});

		it("devrait multiplier l'intervalle par easeFactor après la 2ème révision", () => {
			const easeFactor = 2.5;
			const currentInterval = 6;
			const result = calculateNextReview(4, currentInterval, easeFactor);

			// L'intervalle devrait être environ currentInterval * easeFactor
			expect(result.interval).toBeGreaterThan(currentInterval);
			expect(result.interval).toBeLessThanOrEqual(
				Math.round(currentInterval * easeFactor)
			);
		});

		it("devrait augmenter l'easeFactor avec une excellente réponse (score = 5)", () => {
			const initialEaseFactor = 2.0;
			const result = calculateNextReview(5, 10, initialEaseFactor);

			expect(result.easeFactor).toBeGreaterThan(initialEaseFactor);
		});

		it("ne devrait pas dépasser un easeFactor de 2.5", () => {
			// Même avec un score parfait répété
			const result = calculateNextReview(5, 20, 2.4);

			expect(result.easeFactor).toBeLessThanOrEqual(2.5);
		});
	});

	describe("Cas limites", () => {
		it("devrait gérer un interval à 0", () => {
			const result = calculateNextReview(3, 0, 2.5);

			expect(result.interval).toBeGreaterThan(0);
		});

		it("devrait gérer un easeFactor minimum", () => {
			const result = calculateNextReview(1, 10, 1.3);

			expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
		});

		it("devrait gérer un easeFactor maximum", () => {
			const result = calculateNextReview(5, 10, 2.5);

			expect(result.easeFactor).toBeLessThanOrEqual(2.5);
		});
	});

	describe("Progression typique d'une carte", () => {
		it("devrait progresser correctement sur 5 révisions réussies", () => {
			let interval = 0;
			let easeFactor = 2.5;

			// Révision 1 : score = 4
			let result = calculateNextReview(4, interval, easeFactor);
			expect(result.interval).toBe(1); // Première révision
			interval = result.interval;
			easeFactor = result.easeFactor;

			// Révision 2 : score = 4
			result = calculateNextReview(4, interval, easeFactor);
			expect(result.interval).toBe(6); // Deuxième révision
			interval = result.interval;
			easeFactor = result.easeFactor;

			// Révision 3 : score = 5
			result = calculateNextReview(5, interval, easeFactor);
			expect(result.interval).toBeGreaterThan(6); // Multiplication commence
			interval = result.interval;
			easeFactor = result.easeFactor;

			// Révision 4 : score = 5
			result = calculateNextReview(5, interval, easeFactor);
			expect(result.interval).toBeGreaterThan(interval);
			interval = result.interval;
			easeFactor = result.easeFactor;

			// Révision 5 : score = 5
			result = calculateNextReview(5, interval, easeFactor);
			expect(result.interval).toBeGreaterThan(interval);

			// Après 5 révisions réussies, l'intervalle devrait être significatif
			expect(result.interval).toBeGreaterThan(20);
		});

		it("devrait régresser après un échec puis se stabiliser", () => {
			let interval = 15;
			let easeFactor = 2.3;

			// Échec après plusieurs succès
			let result = calculateNextReview(2, interval, easeFactor);
			expect(result.interval).toBe(1); // Reset
			expect(result.easeFactor).toBeLessThan(easeFactor); // Pénalité

			interval = result.interval;
			easeFactor = result.easeFactor;

			// Récupération progressive
			result = calculateNextReview(4, interval, easeFactor);
			expect(result.interval).toBeGreaterThan(1);
		});
	});
});
