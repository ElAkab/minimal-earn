import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickModel, buildPrompt } from "./ai.js";

// =====================
// Tests pour pickModel
// =====================
describe("pickModel", () => {
	it("devrait retourner le modèle de code si présent dans aiTags", () => {
		const note = {
			aiTags: ["hir0rameel/qwen-claude"],
			description: "Une note quelconque",
		};
		expect(pickModel(note)).toBe("hir0rameel/qwen-claude");
	});

	it("devrait retourner le modèle de code si des mots-clés de programmation sont détectés", () => {
		const note = {
			title: "JavaScript Functions",
			description: "Comment utiliser la fonction map en JavaScript",
		};
		expect(pickModel(note)).toBe("hir0rameel/qwen-claude");
	});

	it("devrait retourner le modèle léger par défaut", () => {
		const note = {
			title: "Géographie",
			description: "La capitale de la France est Paris",
		};
		expect(pickModel(note)).toBe("gpt-oss");
	});

	it("devrait gérer les notes sans title", () => {
		const note = {
			description: "const x = 10;",
		};
		expect(pickModel(note)).toBe("hir0rameel/qwen-claude");
	});

	it("devrait être insensible à la casse", () => {
		const note = {
			description: "JAVASCRIPT FUNCTION declaration",
		};
		expect(pickModel(note)).toBe("hir0rameel/qwen-claude");
	});
});

// =====================
// Tests pour buildPrompt
// =====================
describe("buildPrompt", () => {
	it("devrait inclure le titre si présent", () => {
		const note = {
			title: "Test Title",
			description: "Test description",
		};
		const prompt = buildPrompt(note);
		expect(prompt).toContain("Test Title");
		expect(prompt).toContain("Test description");
	});

	it("devrait fonctionner sans titre", () => {
		const note = {
			description: "Test description without title",
		};
		const prompt = buildPrompt(note);
		expect(prompt).toContain("Test description without title");
		expect(prompt).not.toContain("undefined");
	});

	it("devrait toujours retourner une chaîne non vide", () => {
		const note = {
			description: "",
		};
		const prompt = buildPrompt(note);
		expect(prompt).toBeTruthy();
		expect(typeof prompt).toBe("string");
	});

	it("devrait contenir les instructions pour l'examinateur", () => {
		const note = {
			description: "Test",
		};
		const prompt = buildPrompt(note);
		expect(prompt.toLowerCase()).toContain("examinateur");
	});
});
