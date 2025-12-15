import express from "express";
import cors from "cors";
import routeHandlers from "./routes/routeHandlers.js";
import newRoutes from "./routes/newRoutes.js";
import { startAIWorker } from "./lib/aiWorker.js";

const app = express();
// Utiliser la variable d'environnement si définie, défaut 5000 (pas 5173)
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Démarrer le worker IA au démarrage du serveur
console.log("🚀 Initialisation du worker IA...");
startAIWorker();

app.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

// Monter le router sous /api pour correspondre au fetch client "/api/generate-note"
app.use("/api", routeHandlers);
app.use("/", routeHandlers);

// Monter les nouvelles routes v2
app.use("/api/v2", newRoutes);

app.listen(PORT, () => {
	console.log(`✅ Server is running on http://localhost:${PORT}`);
	console.log(`📡 API v1: http://localhost:${PORT}/api`);
	console.log(`📡 API v2: http://localhost:${PORT}/api/v2`);
});
