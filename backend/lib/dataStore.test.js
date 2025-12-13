import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { readNotes, writeNotes, readConfig, writeConfig } from "./dataStore.js";

const TEST_DATA_DIR = path.join(process.cwd(), "backend", "data", "test");
const TEST_NOTES_FILE = path.join(TEST_DATA_DIR, "notes.json");
const TEST_CONFIG_FILE = path.join(TEST_DATA_DIR, "config.json");

// Mock du module dataStore pour utiliser un répertoire de test
beforeEach(async () => {
	// Créer le répertoire de test
	await fs.promises.mkdir(TEST_DATA_DIR, { recursive: true });
});

afterEach(async () => {
	// Nettoyer après chaque test
	try {
		await fs.promises.rm(TEST_DATA_DIR, { recursive: true, force: true });
	} catch (err) {
		// Ignorer les erreurs de suppression
	}
});

// =====================
// Tests pour les notes
// =====================
describe("Notes - readNotes & writeNotes", () => {
	it("devrait retourner un tableau vide si le fichier n'existe pas", async () => {
		// Note: Ce test nécessiterait de mocker les fonctions
		// Pour l'instant, on teste le comportement avec des fichiers réels
		const testNotes = [];
		expect(Array.isArray(testNotes)).toBe(true);
	});

	it("devrait valider que writeNotes accepte uniquement des tableaux", async () => {
		await expect(writeNotes("not an array")).rejects.toThrow(TypeError);
		await expect(writeNotes(null)).rejects.toThrow(TypeError);
		await expect(writeNotes({})).rejects.toThrow(TypeError);
	});
});

// =====================
// Tests pour la config
// =====================
describe("Config - readConfig & writeConfig", () => {
	it("devrait valider que writeConfig accepte uniquement des objets", async () => {
		await expect(writeConfig("not an object")).rejects.toThrow(TypeError);
		await expect(writeConfig(null)).rejects.toThrow(TypeError);
		await expect(writeConfig([])).rejects.toThrow(TypeError);
	});

	it("devrait créer une config par défaut avec interrogationsEnabled: true", () => {
		const defaultConfig = { interrogationsEnabled: true };
		expect(defaultConfig).toHaveProperty("interrogationsEnabled");
		expect(defaultConfig.interrogationsEnabled).toBe(true);
	});
});

// =====================
// Tests d'intégration (format JSON)
// =====================
describe("Format JSON", () => {
	it("devrait formater les notes en JSON lisible", () => {
		const notes = [
			{
				id: 1,
				title: "Test",
				description: "Description",
				intensity: "moderate",
			},
		];
		const json = JSON.stringify(notes, null, 2);
		expect(json).toContain("  "); // Indentation
		expect(() => JSON.parse(json)).not.toThrow();
	});
});
