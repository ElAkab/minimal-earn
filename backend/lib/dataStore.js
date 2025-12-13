import fs from "fs";
import path from "path";

const __filename = import.meta.filename;
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

/**
 * Lit les notes depuis le fichier JSON
 * @returns {Promise<Array>} - Tableau de notes
 */
export async function readNotes() {
	try {
		// S'assurer que le répertoire existe
		await fs.promises.mkdir(DATA_DIR, { recursive: true });

		const raw = await fs.promises.readFile(DATA_FILE, "utf8");
		const notes = JSON.parse(raw);
		return Array.isArray(notes) ? notes : [];
	} catch (err) {
		// Si le fichier n'existe pas, retourner un tableau vide
		if (err.code === "ENOENT") {
			console.log(
				"📝 Fichier notes.json non trouvé, création d'un nouveau fichier"
			);
			await writeNotes([]);
			return [];
		}
		// Si erreur de parsing JSON
		if (err instanceof SyntaxError) {
			console.error("❌ Erreur de parsing JSON dans notes.json:", err.message);
			// Sauvegarder une copie du fichier corrompu
			const backupFile = path.join(DATA_DIR, `notes.backup.${Date.now()}.json`);
			try {
				await fs.promises.copyFile(DATA_FILE, backupFile);
				console.log(`💾 Backup créé: ${backupFile}`);
			} catch (backupErr) {
				console.error("❌ Impossible de créer le backup:", backupErr);
			}
			// Réinitialiser avec un tableau vide
			await writeNotes([]);
			return [];
		}
		throw err;
	}
}

/**
 * Écrit les notes dans le fichier JSON
 * @param {Array} notes - Tableau de notes à sauvegarder
 */
export async function writeNotes(notes) {
	// Validation
	if (!Array.isArray(notes)) {
		throw new TypeError("writeNotes expects an array of notes");
	}

	await fs.promises.mkdir(DATA_DIR, { recursive: true });
	await fs.promises.writeFile(
		DATA_FILE,
		JSON.stringify(notes, null, 2),
		"utf8"
	);
}

/**
 * Lit la configuration depuis le fichier JSON
 * @returns {Promise<Object>} - Configuration
 */
export async function readConfig() {
	try {
		// S'assurer que le répertoire existe
		await fs.promises.mkdir(DATA_DIR, { recursive: true });

		const raw = await fs.promises.readFile(CONFIG_FILE, "utf8");
		const config = JSON.parse(raw);

		// Valider la structure de la config
		if (typeof config !== "object" || config === null) {
			console.warn("⚠️ Config invalide, utilisation des valeurs par défaut");
			return { interrogationsEnabled: true };
		}

		// S'assurer que interrogationsEnabled existe
		if (typeof config.interrogationsEnabled !== "boolean") {
			config.interrogationsEnabled = true;
		}

		return config;
	} catch (err) {
		// Si le fichier n'existe pas, créer la config par défaut
		if (err.code === "ENOENT") {
			console.log(
				"⚙️ Fichier config.json non trouvé, création avec valeurs par défaut"
			);
			const defaultConfig = { interrogationsEnabled: true };
			await writeConfig(defaultConfig);
			return defaultConfig;
		}
		// Si erreur de parsing JSON
		if (err instanceof SyntaxError) {
			console.error("❌ Erreur de parsing JSON dans config.json:", err.message);
			// Sauvegarder une copie du fichier corrompu
			const backupFile = path.join(
				DATA_DIR,
				`config.backup.${Date.now()}.json`
			);
			try {
				await fs.promises.copyFile(CONFIG_FILE, backupFile);
				console.log(`💾 Backup créé: ${backupFile}`);
			} catch (backupErr) {
				console.error("❌ Impossible de créer le backup:", backupErr);
			}
			// Réinitialiser avec config par défaut
			const defaultConfig = { interrogationsEnabled: true };
			await writeConfig(defaultConfig);
			return defaultConfig;
		}
		throw err;
	}
}

/**
 * Écrit la configuration dans le fichier JSON
 * @param {Object} cfg - Configuration à sauvegarder
 */
export async function writeConfig(cfg) {
	// Validation
	if (typeof cfg !== "object" || cfg === null) {
		throw new TypeError("writeConfig expects an object");
	}

	await fs.promises.mkdir(DATA_DIR, { recursive: true });
	await fs.promises.writeFile(
		CONFIG_FILE,
		JSON.stringify(cfg, null, 2),
		"utf8"
	);
}

export const DATA = {
	DATA_DIR,
	DATA_FILE,
	CONFIG_FILE,
};
