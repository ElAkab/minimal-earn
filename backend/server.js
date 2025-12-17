import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./router/api.js";
import pagesRouter from "./router/pages.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier "pages" directement à la racine
// Cela permet d'accéder aux fichiers sans le préfixe "/pages/"
app.use(express.static(path.join(__dirname, "..", "pages")));

// Montage des routers
app.use("/api", apiRouter); // Toutes les routes /api/* sont gérées par apiRouter
app.use("/", pagesRouter); // Routes des pages (/, /notes)

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
