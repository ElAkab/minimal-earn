import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier "pages" directement à la racine
// Cela permet d'accéder aux fichiers sans le préfixe "/pages/"
app.use(express.static(path.join(__dirname, "..", "pages")));

// Routes
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/notes", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "pages", "notes.html"));
});

app.post("/api/generate-note", (req, res) => {
	const { title, description, intensity, color } = req.body;

	console.log("Received payload:", req.body);

	// Here you can add your logic to generate a note based on the payload

	res.status(200).json({
		message: "Note received successfully",
		note: {
			title,
			description,
			intensity,
			color,
		},
	});
});

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
