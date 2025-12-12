import express from "express";
import cors from "cors";
import routeHandlers from "./routes/routeHandlers.js";

const app = express();
// Utiliser la variable d'environnement si définie, défaut 5000 (pas 5173)
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

// Monter le router sous /api pour correspondre au fetch client "/api/generate-note"
app.use("/api", routeHandlers);
app.use("/", routeHandlers);

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
