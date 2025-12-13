import express from "express";
import * as dataStore from "../lib/dataStore.js";
import * as scheduler from "../lib/scheduler.js";
import * as ai from "../lib/ai.js";

const router = express.Router();

router.get("/", (req, res) => {
	console.log("Hello from the backend server!");
	res.send("Hello from the backend server!");
});

// Create / update note with scheduling metadata
router.post("/generate-note", async (req, res) => {
	try {
		const { aiTags, title, description, intensity } = req.body;

		const note = {
			id: Date.now(),
			aiTags: aiTags || [],
			title: title || "",
			description: description || "",
			intensity: intensity || "moderate",
			createdAt: new Date().toISOString(),
			reviewCount: 0,
			lastReviewed: null,
			lastInterval: scheduler.baseIntervalForIntensity(intensity || "moderate"),
			nextReviewAt: new Date(
				Date.now() + scheduler.baseIntervalForIntensity(intensity || "moderate")
			).toISOString(),
		};

		const notes = await dataStore.readNotes();
		notes.push(note);
		await dataStore.writeNotes(notes);

		console.log("Saved note:", note);
		res.status(200).json({ message: "Note saved successfully", note });
	} catch (error) {
		console.error("Error saving note:", error);
		res.status(500).json({ message: "Failed to save note" });
	}
});

// List all notes
router.get("/notes", async (req, res) => {
	try {
		const notes = await dataStore.readNotes();
		res.json({ notes });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to read notes" });
	}
});

// Return notes due for review (respect config flag)
// Censé être appelé après vérification du toggle côté client
router.get("/due-notes", async (req, res) => {
	try {
		const cfg = await dataStore.readConfig();
		if (!cfg.interrogationsEnabled)
			return res.json({ enabled: false, due: [] });

		const notes = await dataStore.readNotes();
		const now = new Date();
		const due = notes.filter((n) => {
			if (!n.nextReviewAt) return true;
			return new Date(n.nextReviewAt) <= now;
		});
		res.json({ enabled: true, due });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to get due notes" });
	}
});

// Return a prompt for a specific note
router.get("/prompt/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === id);
		if (!note) return res.status(404).json({ message: "Note not found" });
		const prompt = ai.buildPrompt(note);
		res.json({ prompt, ai: ai.pickIA(note.aiTags) });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to build prompt" });
	}
});

// Record a review result and adapt schedule
router.post("/review-note", async (req, res) => {
	try {
		const { id, correct } = req.body;
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === Number(id));
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		const note = notes[idx];
		const update = scheduler.computeNextReview(note, !!correct);
		note.lastReviewed = update.lastReviewed;
		note.lastInterval = update.lastInterval;
		note.nextReviewAt = update.nextReviewAt;
		note.reviewCount = update.reviewCount;

		notes[idx] = note;
		await dataStore.writeNotes(notes);

		res.json({ message: "Review recorded", note });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to record review" });
	}
});

// Get / set config (toggle interrogations)
router.get("/config", async (req, res) => {
	try {
		const cfg = await dataStore.readConfig();
		res.json(cfg);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to read config" });
	}
});

router.post("/config", async (req, res) => {
	try {
		const incoming = req.body || {};
		// Whitelist of allowed config properties
		const allowedProps = ["interrogationsEnabled", "someOtherConfigKey"]; // TODO: update with actual config keys
		const filtered = {};
		for (const key of allowedProps) {
			if (Object.prototype.hasOwnProperty.call(incoming, key)) {
				filtered[key] = incoming[key];
			}
		}
		const cfg = Object.assign(await dataStore.readConfig(), filtered);
		await dataStore.writeConfig(cfg);
		res.json(cfg);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to write config" });
	}
});

// Simulate schedule without persisting (secure test of algorithm)
router.post("/simulate-schedule", async (req, res) => {
	try {
		const { id, correct } = req.body;
		const notes = await dataStore.readNotes();
		const note = notes.find((n) => n.id === Number(id));
		if (!note) return res.status(404).json({ message: "Note not found" });
		const simulated = scheduler.computeNextReview(note, !!correct);
		res.json({ simulated });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Simulation failed" });
	}
});

// Delete a note by ID
router.delete("/notes/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === id);
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		notes.splice(idx, 1);
		await dataStore.writeNotes(notes);

		res.json({ message: "Note deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to delete note" });
	}
});

// Update a note by ID
router.put("/notes/:id", async (req, res) => {
	try {
		const id = Number(req.params.id);
		const { title, description, intensity, aiTags } = req.body;
		const notes = await dataStore.readNotes();
		const idx = notes.findIndex((n) => n.id === id);
		if (idx === -1) return res.status(404).json({ message: "Note not found" });

		const note = notes[idx];
		// Update only provided fields
		if (title !== undefined) note.title = title;
		if (description !== undefined) note.description = description;
		if (aiTags !== undefined) note.aiTags = aiTags;
		if (intensity !== undefined) {
			note.intensity = intensity;
			// Recalculate scheduling if intensity changed
			note.lastInterval = scheduler.baseIntervalForIntensity(intensity);
			note.nextReviewAt = new Date(
				Date.now() + note.lastInterval
			).toISOString();
		}

		notes[idx] = note;
		await dataStore.writeNotes(notes);

		res.json({ message: "Note updated successfully", note });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to update note" });
	}
});

export default router;
