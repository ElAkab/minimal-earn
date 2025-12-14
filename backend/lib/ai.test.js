import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	pickModel,
	pickModelForTask,
	buildPrompt,
	generateQuestion,
} from "./ai.js";

// Mock Ollama - doit être une classe pour new Ollama()
vi.mock("ollama", () => {
	return {
		Ollama: class MockOllama {
			async generate() {
				return {
					response: "Question générée par mock IA ?",
				};
			}
		},
	};
});
}));

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

// =====================
// Tests pour pickModelForTask
// =====================
describe("pickModelForTask", () => {
	it("devrait retourner le modèle léger pour evaluation", () => {
		const note = { description: "Test" };
		expect(pickModelForTask(note, "evaluation")).toBe("gpt-oss");
	});

	it("devrait retourner le modèle léger pour hint", () => {
		const note = { description: "Test" };
		expect(pickModelForTask(note, "hint")).toBe("gpt-oss");
	});

	it("devrait retourner le modèle code pour generation avec contenu programmation", () => {
		const note = { description: "JavaScript function" };
		expect(pickModelForTask(note, "generation")).toBe("hir0rameel/qwen-claude");
	});

	it("devrait retourner le modèle léger pour generation avec contenu général", () => {
		const note = { description: "La capitale de la France" };
		expect(pickModelForTask(note, "generation")).toBe("gpt-oss");
	});

	it("devrait gérer une tâche invalide", () => {
		const note = { description: "Test" };
		expect(pickModelForTask(note, "invalid")).toBe("gpt-oss");
	});
});

// =====================
// Tests pour generateQuestion
// =====================
describe("generateQuestion", () => {
	it("devrait retourner {question, model} au lieu d'une simple string", async () => {
		const note = {
			title: "Test",
			description: "Description test",
		};

		const result = await generateQuestion(note);

		// Vérifier que le résultat est un objet avec question et model
		expect(result).toHaveProperty("question");
		expect(result).toHaveProperty("model");
		expect(typeof result.question).toBe("string");
		expect(typeof result.model).toBe("string");
	}, 30000); // Timeout de 30s

	it("devrait utiliser le bon modèle selon le contenu", async () => {
		const codeNote = {
			description: "Comment utiliser Array.map() en JavaScript ?",
		};

		const generalNote = {
			description: "Quelle est la capitale de la France ?",
		};

		const codeResult = await generateQuestion(codeNote);
		const generalResult = await generateQuestion(generalNote);

		// Le modèle de code pour la note de programmation
		expect(codeResult.model).toBe("hir0rameel/qwen-claude");

		// Le modèle léger pour la note générale
		expect(generalResult.model).toBe("gpt-oss");
	}, 30000);

	it("devrait retourner une question non vide", async () => {
		const note = {
			description: "Test simple",
		};

		const result = await generateQuestion(note);

		expect(result.question).toBeTruthy();
		expect(result.question.length).toBeGreaterThan(0);
	}, 30000);

	it("devrait gérer les erreurs de génération", async () => {
		const invalidNote = null;

		await expect(generateQuestion(invalidNote)).rejects.toThrow();
	});
});
