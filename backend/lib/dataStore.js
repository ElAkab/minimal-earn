import fs from "fs";
import path from "path";

const __filename = import.meta.filename;
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

export async function readNotes() {
	try {
		const raw = await fs.promises.readFile(DATA_FILE, "utf8");
		const notes = JSON.parse(raw);
		return Array.isArray(notes) ? notes : [];
	} catch (err) {
		if (err.code === "ENOENT") return [];
		throw err;
	}
}

export async function writeNotes(notes) {
	await fs.promises.mkdir(DATA_DIR, { recursive: true });
	await fs.promises.writeFile(
		DATA_FILE,
		JSON.stringify(notes, null, 2),
		"utf8"
	);
}

export async function readConfig() {
	try {
		const raw = await fs.promises.readFile(CONFIG_FILE, "utf8");
		return JSON.parse(raw);
	} catch (err) {
		if (err.code === "ENOENT") return { interrogationsEnabled: true };
		throw err;
	}
}

export async function writeConfig(cfg) {
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
