import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Route pour la page d'accueil
 */
router.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "..", "index.html"));
});

/**
 * Route pour la page des notes
 */
router.get("/notes", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "..", "pages", "notes.html"));
});

export default router;
