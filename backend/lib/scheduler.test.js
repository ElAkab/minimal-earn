import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	baseIntervalForIntensity,
	computeNextInterval,
	computeNextReview,
} from "./scheduler.js";

const MS = {
	hour: 3600 * 1000,
	day: 24 * 3600 * 1000,
};

describe("scheduler module", () => {
	const FIXED_TIME = new Date("2025-01-01T00:00:00.000Z");

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe("baseIntervalForIntensity()", () => {
		it("returns 7 days for 'chill'", () => {
			expect(baseIntervalForIntensity("chill")).toBe(7 * MS.day);
		});

		it("returns 1 day for 'moderate'", () => {
			expect(baseIntervalForIntensity("moderate")).toBe(1 * MS.day);
		});

		it("returns 6 hours for 'intensive'", () => {
			expect(baseIntervalForIntensity("intensive")).toBe(6 * MS.hour);
		});

		it("returns default 1 day for unknown intensity", () => {
			expect(baseIntervalForIntensity("unknown")).toBe(1 * MS.day);
		});
	});

	describe("computeNextInterval()", () => {
		// Ce test vérifie que lorsque prevInterval est falsy (undefined) et que la réponse est correcte (correct = true), la fonction utilise l'intervalle de base pour l'intensité donnée et l'augmente de 1.5x.
		it("uses base when prevInterval falsy and increases by 1.5x when correct", () => {
			const result = computeNextInterval(undefined, "moderate", true);
			expect(result).toBe(1.5 * MS.day);
		});

		it("reduces interval when incorrect (uses 0.6x or base*0.5 whichever is larger)", () => {
			const prev = 1 * MS.day;
			const result = computeNextInterval(prev, "moderate", false);
			expect(result).toBeCloseTo(0.6 * prev);
		});

		it("applies the 365 days cap when correct would exceed it", () => {
			const hugePrev = 400 * MS.day;
			const result = computeNextInterval(hugePrev, "moderate", true);
			expect(result).toBe(365 * MS.day);
		});

		it("never returns less than one hour", () => {
			const tinyPrev = 1000; // 1 second
			const result = computeNextInterval(tinyPrev, "moderate", false);
			expect(result).toBeGreaterThanOrEqual(MS.hour);
		});
	});

	describe("computeNextReview()", () => {
		// Est censé utiliser le temps fixe défini dans beforeEach
		it("returns expected metadata when review is correct and increments reviewCount", () => {
			// 1 - arrange : On prépare une note exemple
			const nowMs = Date.now();
			const note = {
				id: 1,
				intensity: "moderate",
				lastInterval: 1 * MS.day, // correspond à l'intervalle précédent : 1 jour
				reviewCount: 0, // nombre de revues précédentes : on part de zéro
			};

			// 2 - act : On simule une revue correcte de cette note
			const updated = computeNextReview(note, true);

			// On calcule l'intervalle attendu après une revue correcte (en gros ça augmente de 1.5x ce qui veut dire que ça passe de 1 jour à 1.5 jour)
			const expectedInterval = computeNextInterval(
				// On stocke le résultat pour les assertions qui vaut l'intervalle calculé (ex : 1.5 jour)
				note.lastInterval,
				note.intensity,
				true
			);

			// 3 - assert : On vérifie que les valeurs retournées sont bien celles attendues (donc l'intervalle, la date de prochaine revue, la date de dernière revue et le compteur de revues)
			expect(updated.lastInterval).toBe(expectedInterval); // lastInterval doit être égal à l'intervalle attendu

			// On vérifie que nextReviewAt est bien la date actuelle + l'intervalle attendu (ça sert à savoir quand la prochaine revue doit avoir lieu)
			expect(new Date(updated.nextReviewAt).toISOString()).toBe(
				new Date(nowMs + expectedInterval).toISOString() // On convertit en ISO pour comparer les dates au format string. ça évite les soucis de précision avec les objets Date
			);

			// On vérifie que lastReviewed est bien la date actuelle (ça sert à savoir quand la note a été revue pour la dernière fois)
			expect(new Date(updated.lastReviewed).toISOString()).toBe(
				new Date(nowMs).toISOString()
			);

			// On vérifie que le compteur de revues a bien été incrémenté de 1
			expect(updated.reviewCount).toBe(1);

			// En résumé : On vérifie que toutes les métadonnées de scheduling sont correctement mises à jour après une revue correcte
		});

		it("does not increment reviewCount when incorrect", () => {
			const nowMs = Date.now();
			const note = {
				id: 2,
				intensity: "intensive",
				lastInterval: 6 * MS.hour,
				reviewCount: 5,
			};
			const updated = computeNextReview(note, false);

			const expectedInterval = computeNextInterval(
				note.lastInterval,
				note.intensity,
				false
			);
			expect(updated.lastInterval).toBe(expectedInterval);
			expect(new Date(updated.nextReviewAt).toISOString()).toBe(
				new Date(nowMs + expectedInterval).toISOString()
			);
			expect(new Date(updated.lastReviewed).toISOString()).toBe(
				new Date(nowMs).toISOString()
			);

			expect(updated.reviewCount).toBe(note.reviewCount);
		});

		it("handles missing reviewCount by initializing properly", () => {
			const note = { id: 3, intensity: "chill", lastInterval: undefined };
			const updatedCorrect = computeNextReview(note, true);
			expect(updatedCorrect.reviewCount).toBe(1);

			const updatedIncorrect = computeNextReview(
				{ ...note, reviewCount: 0 },
				false
			);
			expect(updatedIncorrect.reviewCount).toBe(0);
		});
	});
});
