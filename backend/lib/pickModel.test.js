import { describe, it, expect } from "vitest"; // ou jest si vous préférez
import { pickModel, pickModelForTask } from "./ai.js";

/**
 * Tests unitaires pour pickModel() (deprecated) et pickModelForTask()
 *
 * Objectif : Vérifier que le bon modèle est sélectionné selon le contenu de la note
 *
 * Cas testés :
 * 1. Note avec tag IA explicite → modèle code
 * 2. Note avec contenu "programming" → modèle code
 * 3. Note standard → modèle lightweight
 * 4. Note vide → modèle lightweight (par défaut)
 */
describe("pickModel()", () => {
	it('devrait retourner le modèle code si aiTags contient "hir0rameel/qwen-claude"', () => {
		const note = {
			title: "Test",
			description: "Une note quelconque",
			aiTags: ["hir0rameel/qwen-claude"],
		};

		const result = pickModel(note);

		expect(result).toBe("hir0rameel/qwen-claude");
	});

	it("devrait retourner le modèle léger par défaut", () => {
		const note = {
			title: "Recette de cuisine",
			description: "Comment faire une tarte aux pommes",
		};

		const result = pickModel(note);

		expect(result).toBe("gpt-oss");
	});

	it("devrait gérer une note vide", () => {
		const note = {
			title: "",
			description: "",
		};

		const result = pickModel(note);

		expect(result).toBe("gpt-oss");
	});

	it("devrait gérer une note sans titre", () => {
		const note = {
			description: "Une description sans titre",
		};

		const result = pickModel(note);

		expect(result).toBe("gpt-oss");
	});
});

// =====================
// Tests pour pickModelForTask() - Nouvelle API
// =====================
describe("pickModelForTask() - Nouvelle API", () => {
	it("devrait toujours retourner le modèle léger pour evaluation", () => {
		const note = { description: "JavaScript code" };
		expect(pickModelForTask(note, "evaluation")).toBe("gpt-oss");
	});

	it("devrait toujours retourner le modèle léger pour hint", () => {
		const note = { description: "JavaScript code" };
		expect(pickModelForTask(note, "hint")).toBe("gpt-oss");
	});

	it("devrait sélectionner dynamiquement pour generation", () => {
		const codeNote = { description: "JavaScript function" };
		const generalNote = { description: "Histoire de France" };

		expect(pickModelForTask(codeNote, "generation")).toBe(
			"hir0rameel/qwen-claude"
		);
		expect(pickModelForTask(generalNote, "generation")).toBe("gpt-oss");
	});
});
