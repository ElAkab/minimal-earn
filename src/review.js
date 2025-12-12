// Logique de révision avec IA
import { showToast } from "./toast.js";

const API_URL = "http://localhost:5000/api";

let dueNotes = [];
let currentNote = null;
let currentPrompt = null;
let stats = { correct: 0, incorrect: 0, remaining: 0 };

// Éléments DOM
const loadingState = document.getElementById("loading-state");
const noReviewState = document.getElementById("no-review-state");
const disabledState = document.getElementById("disabled-state");
const reviewCard = document.getElementById("review-card");
const statsSection = document.getElementById("stats-section");

const toggleInterrogations = document.getElementById("toggle-interrogations");
const noteIntensityBadge = document.getElementById("note-intensity-badge");
const noteTags = document.getElementById("note-tags");
const noteContext = document.getElementById("note-context");
const noteTitle = document.getElementById("note-title");
const noteDescription = document.getElementById("note-description");
const questionText = document.getElementById("question-text");
const answerInput = document.getElementById("answer-input");
const feedbackSection = document.getElementById("feedback-section");

const submitAnswerBtn = document.getElementById("submit-answer");
const showHintBtn = document.getElementById("show-hint");
const dontKnowBtn = document.getElementById("dont-know");
const showContextBtn = document.getElementById("show-context");
const closeReviewBtn = document.getElementById("close-review");

// =====================
// Initialisation
// =====================
async function init() {
	await loadConfig();
	await loadDueNotes();
}

// =====================
// Charger la config
// =====================
async function loadConfig() {
	try {
		const response = await fetch(`${API_URL}/config`);
		const config = await response.json();
		toggleInterrogations.checked = config.interrogationsEnabled;
	} catch (error) {
		console.error("Error loading config:", error);
	}
}

// =====================
// Toggle des interrogations
// =====================
toggleInterrogations.addEventListener("change", async (e) => {
	try {
		const response = await fetch(`${API_URL}/config`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ interrogationsEnabled: e.target.checked }),
		});

		if (!response.ok) throw new Error("Erreur lors de la mise à jour");

		showToast(
			e.target.checked
				? "Interrogations activées"
				: "Interrogations désactivées",
			"success"
		);

		await loadDueNotes();
	} catch (error) {
		console.error("Error toggling interrogations:", error);
		showToast("Erreur lors de la mise à jour", "error");
		e.target.checked = !e.target.checked;
	}
});

// =====================
// Charger les notes dues
// =====================
async function loadDueNotes() {
	showState("loading");

	try {
		const response = await fetch(`${API_URL}/due-notes`);
		const data = await response.json();

		if (!data.enabled) {
			showState("disabled");
			return;
		}

		dueNotes = data.due || [];
		stats.remaining = dueNotes.length;
		updateStats();

		if (dueNotes.length === 0) {
			showState("no-review");
		} else {
			await loadNextReview();
		}
	} catch (error) {
		console.error("Error loading due notes:", error);
		showToast("Erreur lors du chargement des révisions", "error");
		showState("no-review");
	}
}

// =====================
// Charger la prochaine révision
// =====================
async function loadNextReview() {
	if (dueNotes.length === 0) {
		showState("no-review");
		showToast("Toutes les révisions terminées ! 🎉", "success", 5000);
		return;
	}

	currentNote = dueNotes[0];
	showState("loading");

	try {
		// Récupérer le prompt généré par l'IA
		const response = await fetch(`${API_URL}/prompt/${currentNote.id}`);
		if (!response.ok) throw new Error("Erreur lors de la récupération du prompt");

		const data = await response.json();
		currentPrompt = data.prompt;

		displayReview();
	} catch (error) {
		console.error("Error loading prompt:", error);
		showToast("Erreur lors du chargement de la question", "error");
		dueNotes.shift();
		stats.remaining--;
		updateStats();
		await loadNextReview();
	}
}

// =====================
// Afficher la carte de révision
// =====================
function displayReview() {
	showState("review");

	// Badge intensité
	const intensityColors = {
		chill: "bg-blue-500",
		moderate: "bg-amber-500",
		intensive: "bg-red-500",
	};
	noteIntensityBadge.className = `inline-block ${
		intensityColors[currentNote.intensity] || "bg-gray-500"
	} text-xs px-3 py-1 rounded-full text-white font-semibold`;
	noteIntensityBadge.textContent = currentNote.intensity || "moderate";

	// Tags IA
	const aiTagColors = {
		claudeCode: "bg-orange-500",
		gemma3: "bg-cyan-500",
	};
	noteTags.innerHTML = currentNote.aiTags
		? currentNote.aiTags
				.map(
					(tag) =>
						`<span class="inline-block ${
							aiTagColors[tag] || "bg-gray-700"
						} text-xs px-2 py-1 rounded text-white">${tag}</span>`
				)
				.join(" ")
		: "";

	// Contexte caché par défaut
	noteContext.classList.add("hidden");
	noteTitle.textContent = currentNote.title || "";
	noteDescription.textContent = currentNote.description || "";

	// Question
	questionText.textContent = currentPrompt;

	// Réinitialiser
	answerInput.value = "";
	feedbackSection.classList.add("hidden");
	feedbackSection.innerHTML = "";
}

// =====================
// Soumettre la réponse
// =====================
submitAnswerBtn.addEventListener("click", async () => {
	const answer = answerInput.value.trim();

	if (!answer) {
		showToast("Veuillez entrer une réponse", "warning");
		return;
	}

	// TODO: Évaluation par l'IA (pour l'instant, simulation)
	// En attendant l'intégration Ollama, on simule
	const isCorrect = answer.length > 10; // Simulation basique

	await recordReview(isCorrect);
	showFeedback(isCorrect, answer);
});

// =====================
// Je ne sais pas
// =====================
dontKnowBtn.addEventListener("click", async () => {
	await recordReview(false);
	showFeedback(false, null);
});

// =====================
// Indice
// =====================
showHintBtn.addEventListener("click", () => {
	showToast("Indice : Relisez attentivement le contexte de la note", "info", 5000);
	noteContext.classList.remove("hidden");
});

// =====================
// Afficher le contexte
// =====================
showContextBtn.addEventListener("click", () => {
	noteContext.classList.toggle("hidden");
});

// =====================
// Fermer (skip)
// =====================
closeReviewBtn.addEventListener("click", () => {
	dueNotes.shift();
	stats.remaining--;
	updateStats();
	loadNextReview();
});

// =====================
// Enregistrer la révision
// =====================
async function recordReview(correct) {
	try {
		const response = await fetch(`${API_URL}/review-note`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: currentNote.id, correct }),
		});

		if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

		const data = await response.json();
		console.log("Review recorded:", data);

		// Mise à jour stats
		if (correct) {
			stats.correct++;
		} else {
			stats.incorrect++;
		}
		stats.remaining--;
		updateStats();
	} catch (error) {
		console.error("Error recording review:", error);
		showToast("Erreur lors de l'enregistrement", "error");
	}
}

// =====================
// Afficher le feedback
// =====================
function showFeedback(correct, answer) {
	feedbackSection.classList.remove("hidden");

	if (correct) {
		feedbackSection.className = "mt-6 p-4 rounded bg-green-900 border border-green-600";
		feedbackSection.innerHTML = `
			<div class="flex items-start gap-3">
				<svg class="w-6 h-6 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
				</svg>
				<div class="flex-1">
					<h3 class="font-bold text-green-400 mb-2">Correct ! 🎉</h3>
					<p class="text-sm">Excellente réponse ! La prochaine révision sera dans un délai plus long.</p>
				</div>
			</div>
		`;
		showToast("Réponse correcte ! ✅", "success");
	} else {
		feedbackSection.className = "mt-6 p-4 rounded bg-red-900 border border-red-600";
		feedbackSection.innerHTML = `
			<div class="flex items-start gap-3">
				<svg class="w-6 h-6 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
				</svg>
				<div class="flex-1">
					<h3 class="font-bold text-red-400 mb-2">Pas tout à fait...</h3>
					<p class="text-sm mb-3">Cette note reviendra plus rapidement pour renforcer votre apprentissage.</p>
					${
						currentNote.description
							? `<div class="p-3 bg-gray-800 rounded mt-2">
								<p class="text-sm font-medium text-gray-300">Rappel :</p>
								<p class="text-sm text-gray-400 mt-1">${escapeHtml(
									currentNote.description
								)}</p>
							</div>`
							: ""
					}
				</div>
			</div>
		`;
		showToast("Réponse incorrecte ❌", "error");
	}

	// Passer à la suivante après 3 secondes
	setTimeout(() => {
		dueNotes.shift();
		loadNextReview();
	}, 3000);
}

// =====================
// Mettre à jour les stats
// =====================
function updateStats() {
	document.getElementById("stat-correct").textContent = stats.correct;
	document.getElementById("stat-incorrect").textContent = stats.incorrect;
	document.getElementById("stat-remaining").textContent = stats.remaining;

	if (stats.correct > 0 || stats.incorrect > 0) {
		statsSection.classList.remove("hidden");
	}
}

// =====================
// Gestion des états d'affichage
// =====================
function showState(state) {
	loadingState.classList.add("hidden");
	noReviewState.classList.add("hidden");
	disabledState.classList.add("hidden");
	reviewCard.classList.add("hidden");

	switch (state) {
		case "loading":
			loadingState.classList.remove("hidden");
			break;
		case "no-review":
			noReviewState.classList.remove("hidden");
			break;
		case "disabled":
			disabledState.classList.remove("hidden");
			break;
		case "review":
			reviewCard.classList.remove("hidden");
			break;
	}
}

// =====================
// Utilitaires
// =====================
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

// =====================
// Initialisation
// =====================
init();
