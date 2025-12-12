// Gestion des routes backend
import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

router.post("/generate-note", (req, res) => {
	const { AI, title, description, intensity } = req.body;
	console.log("Received payload:", { AI, title, description, intensity });
	res.status(200).json({ message: "Note generated successfully!" });
});

export default router;
