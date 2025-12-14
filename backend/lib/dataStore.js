import fs from "fs";
import path from "path";

const __filename = import.meta.filename;
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const QUESTION_CACHE_FILE = path.join(DATA_DIR, "questionCache.json");

// =====================
// Helpers génériques JSON
// =====================

/**
 * Lit un fichier JSON avec gestion d'erreurs et backup
 * @param {string} filePath - Chemin du fichier JSON
 * @param {*} defaultValue - Valeur par défaut si le fichier n'existe pas
 * @param {string} [fileLabel] - Label pour les logs (ex: "notes.json")
 * @returns {Promise<*>} - Données parsées ou valeur par défaut
 */
export async function readJsonFile(
	filePath,
	defaultValue,
	fileLabel = path.basename(filePath)
) {
	try {
		await fs.promises.mkdir(DATA_DIR, { recursive: true });
		const raw = await fs.promises.readFile(filePath, "utf8");
		const data = JSON.parse(raw);
		return data;
	} catch (err) {
		if (err.code === "ENOENT") {
			console.log(
				`📝 Fichier ${fileLabel} non trouvé, création avec valeur par défaut`
			);
			await writeJsonFile(filePath, defaultValue);
			return defaultValue;
		}
		if (err instanceof SyntaxError) {
			console.error(
				`❌ Erreur de parsing JSON dans ${fileLabel}:`,
				err.message
			);
			// Sauvegarder une copie du fichier corrompu
			const backupFile = path.join(
				DATA_DIR,
				`${path.basename(filePath, ".json")}.backup.${Date.now()}.json`
			);
			try {
				await fs.promises.copyFile(filePath, backupFile);
				console.log(`💾 Backup créé: ${backupFile}`);
			} catch (backupErr) {
				console.error("❌ Impossible de créer le backup:", backupErr);
			}
			// Réinitialiser avec valeur par défaut
			await writeJsonFile(filePath, defaultValue);
			return defaultValue;
		}
		throw err;
	}
}

/**
 * Écrit un fichier JSON avec formatting
 * @param {string} filePath - Chemin du fichier JSON
 * @param {*} value - Valeur à sauvegarder
 */
export async function writeJsonFile(filePath, value) {
	await fs.promises.mkdir(DATA_DIR, { recursive: true });
	await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

// =====================
// Fonctions spécifiques
// =====================

/**
 * Lit les notes depuis le fichier JSON
 * @returns {Promise<Array>} - Tableau de notes
 */
export async function readNotes() {
	const notes = await readJsonFile(DATA_FILE, [], "notes.json");
	return Array.isArray(notes) ? notes : [];
}

/**
 * Écrit les notes dans le fichier JSON
 * @param {Array} notes - Tableau de notes à sauvegarder
 */
export async function writeNotes(notes) {
	if (!Array.isArray(notes)) {
		throw new TypeError("writeNotes expects an array of notes");
	}
	await writeJsonFile(DATA_FILE, notes);
}

/**
 * Lit la configuration depuis le fichier JSON
 * @returns {Promise<Object>} - Configuration
 */
export async function readConfig() {
	const defaultConfig = {
		interrogationsEnabled: true,
		questionCacheTTLDays: 7,
	};

	const config = await readJsonFile(CONFIG_FILE, defaultConfig, "config.json");

	// Valider la structure de la config
	if (typeof config !== "object" || config === null) {
		console.warn("⚠️ Config invalide, utilisation des valeurs par défaut");
		return defaultConfig;
	}

	// S'assurer que interrogationsEnabled existe
	if (typeof config.interrogationsEnabled !== "boolean") {
		config.interrogationsEnabled = true;
	}

	// S'assurer que questionCacheTTLDays existe et est valide
	if (
		typeof config.questionCacheTTLDays !== "number" ||
		config.questionCacheTTLDays <= 0 ||
		!Number.isFinite(config.questionCacheTTLDays)
	) {
		config.questionCacheTTLDays = 7;
	}

	return config;
}

/**
 * Écrit la configuration dans le fichier JSON
 * @param {Object} cfg - Configuration à sauvegarder
 */
export async function writeConfig(cfg) {
	if (typeof cfg !== "object" || cfg === null) {
		throw new TypeError("writeConfig expects an object");
	}
	await writeJsonFile(CONFIG_FILE, cfg);
}

/**
 * Lit le cache de questions depuis le fichier JSON
 * @returns {Promise<Object>} - Objet de cache { noteId: { question, model, generatedAt, expiresAt } }
 */
export async function readQuestionCache() {
	const cache = await readJsonFile(
		QUESTION_CACHE_FILE,
		{},
		"questionCache.json"
	);
	return typeof cache === "object" && cache !== null ? cache : {};
}

/**
 * Écrit le cache de questions dans le fichier JSON
 * @param {Object} cache - Objet de cache à sauvegarder
 */
export async function writeQuestionCache(cache) {
	if (typeof cache !== "object" || cache === null) {
		throw new TypeError("writeQuestionCache expects an object");
	}
	await writeJsonFile(QUESTION_CACHE_FILE, cache);
}

/**
 * Récupère le TTL du cache en millisecondes depuis la config
 * @returns {Promise<number>} - TTL en millisecondes
 */
export async function getCacheTTL() {
	const config = await readConfig();
	const ttlDays = config.questionCacheTTLDays || 7;
	return ttlDays * 24 * 60 * 60 * 1000;
}

export const DATA = {
	DATA_DIR,
	DATA_FILE,
	CONFIG_FILE,
	QUESTION_CACHE_FILE,
};
