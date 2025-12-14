import "flowbite";
import { initInterrogationsToggle } from "./config.js";
import { showToast } from "./toast.js";
import { showErrorModal, withErrorHandling } from "./errorHandler.js";
import { showLoadingOverlay, hideLoadingOverlay } from "./loader.js";

// =====================
// Imports
// =====================
import { renderMarkdown, stylizeMarkdown } from "./markdown.js";

// =====================
// Sélection d'éléments
// =====================
let progBtns = document.querySelectorAll(".check-btn");
let noteTitleInput = document.getElementById("note-title");
let noteDescInput = document.getElementById("notes-desc");
let radioChill = document.getElementById("helper-radio-4");
let radioModerate = document.getElementById("helper-radio-5");
let radioIntensive = document.getElementById("helper-radio-6");
let radioSoon = document.getElementById("helper-radio-7");
let submitBtn = document.getElementById("submit-form");

// Choix de l'IA
const AI = {
	"hir0rameel/qwen-claude": false,
	"gpt-oss": false,
};

// =====================
// Gestion du click > IA
// =====================
progBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
		// Récupère le type d'IA associé au bouton via l'attribut data-ai
		const aiType = btn.dataset.ai;

		// Ignore si le bouton n'a pas de type valide
		if (!aiType || !AI.hasOwnProperty(aiType)) return;

		// Si l'IA correspondante est déjà activée → la désactive
		if (AI[aiType]) {
			AI[aiType] = false;
			console.log(`${aiType} = false`);
		} else {
			// Sinon, désactive toutes les autres IA
			for (const key in AI) AI[key] = false;
			// Active uniquement l'IA correspondante
			AI[aiType] = true;
			console.log(`${aiType} = true`);
		}
	});
});

// =====================
// Action du submitBtn
// =====================
submitBtn.addEventListener("click", async (e) => {
	e.preventDefault();
	// =====================
	// Sélection des valeurs
	// =====================
	const noteTitle = noteTitleInput.value;
	const noteDesc = noteDescInput.value;

	// Si le titre est vide on ajoute une bordure rouge et on stoppe l'exécution
	if (noteDesc === "")
		return noteDescInput.classList.add("border", "border-red-500");

	// =====================
	// Filtrer les éléments non "true"
	// =====================
	const trueEl = Object.keys(AI).filter((key) => AI[key] === true);

	// =====================
	// Préparation de l'objet à envoyer
	// =====================
	const payload = {
		aiTags: trueEl,
		title: noteTitle,
		description: noteDesc,
		// "intensity" will be added based on radio selection
	};

	// =====================
	// Gestion des radios
	// =====================
	if (radioSoon.checked) {
		payload.intensity = "soon";
	} else if (radioChill.checked) {
		payload.intensity = "chill";
	} else if (radioModerate.checked) {
		payload.intensity = "moderate";
	} else if (radioIntensive.checked) {
		payload.intensity = "intensive";
	}

	try {
		const response = await fetch("http://localhost:5000/api/generate-note", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log("Response from server:", data);
	} catch (error) {
		// Gérer les erreurs de réseau ou autres
		console.error("Error during fetch:", error);
		alert("Une erreur est survenue lors de la génération de la note.");
	}

	// =====================
	// Affichage du payload dans la console
	// ====================
	// console.log(payload);
	// console.log(
	// 	radioChill.checked,
	// 	radioModerate.checked,
	// 	radioIntensive.checked
	// );
});

// =====================
// Fonction pour créer la carte d'interrogation interactive
// =====================
// Fonction pour créer une carte d'interrogation
// @param {Object} note - Note source
// @param {string} question - Question générée
// @param {string} model - Modèle IA utilisé
// @param {boolean} cached - Si la question provient du cache (défaut: false)
// @param {string} generatedAt - Date de génération (optionnel)
// =====================
function createReviewCard(
	note,
	question,
	model,
	cached = false,
	generatedAt = null
) {
	const intensityColors = {
		soon: "bg-purple-500",
		chill: "bg-blue-500",
		moderate: "bg-amber-500",
		intensive: "bg-red-500",
	};
	const aiTagColors = {
		"hir0rameel/qwen-claude": "text-orange-500",
		"gpt-oss": "text-cyan-500",
	};

	// Badge intensité
	const intensityBadge = `<span class="inline-block ${
		intensityColors[note.intensity] || "bg-gray-500"
	} text-xs px-3 py-1 rounded-full text-white font-semibold">${
		note.intensity || "moderate"
	}</span>`;

	// Badge cache (si question pré-générée)
	const cacheBadge = cached
		? `<span class="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/30 font-medium animate-pulse">
				<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
					<path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
					<path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
				</svg>
				Pré-générée ⚡
			</span>`
		: `<span class="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-500/30 font-medium">
				<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Générée à la demande
			</span>`;

	// Créer l'overlay et la carte avec animations améliorées
	const overlay = document.createElement("div");
	overlay.className =
		"fixed bottom-4 right-4 z-50 transform translate-x-full transition-all duration-500 ease-out";
	overlay.innerHTML = `
		<div class="review-card flex flex-col bg-linear-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-[605px] h-[672px] transform transition-all duration-500 scale-90 opacity-0 border border-gray-700/50">
			<!-- Header -->
			<div class="p-6 border-b border-gray-700 shrink-0 bg-linear-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
				<div class="flex items-start justify-between mb-3">
					<div class="flex items-center gap-2 flex-wrap">
						${intensityBadge}
						${cacheBadge}
					</div>
					<button type="button" class="close-card text-gray-400 hover:text-white transition-all duration-200 hover:rotate-90 cursor-pointer">
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					</button>
				</div>
				${
					note.title
						? `<h3 class="text-2xl font-bold mb-2 bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">${escapeHtml(
								note.title
						  )}</h3>`
						: ""
				}
				<div class="flex items-center gap-2 text-xs text-gray-400">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
					</svg>
					<span>Modèle : ${escapeHtml(model)}</span>
					${
						generatedAt
							? `<span class="opacity-60">• ${new Date(
									generatedAt
							  ).toLocaleString("fr-FR", {
									dateStyle: "short",
									timeStyle: "short",
							  })}</span>`
							: ""
					}
				</div>
			</div>

			<!-- Zone scrollable (Question + Contexte) -->
			<div class="flex flex-col flex-1 overflow-y-auto">
				<!-- Question -->
				<div class="p-6 border-b border-gray-700">
					<h4 class="text-sm font-medium text-gray-400 mb-2">Question :</h4>
					<div class="text-white text-base leading-relaxed markdown-content">${renderMarkdown(
						question
					)}</div>
				</div>

				<!-- Contexte (caché par défaut) -->
				<div class="context-section hidden p-6 bg-gray-900/50 border-b border-gray-700">
					<h4 class="text-sm font-medium text-gray-400 mb-2"><i>Honte à toi... :</i></h4>
					<div class="text-gray-300 text-sm markdown-content">${renderMarkdown(
						note.description
					)}</div>
				</div>
			</div>

			<!-- Zone fixe en bas (Réponse + Feedback + Actions) -->
			<div class="shrink-0 flex flex-col">
				<!-- Champ de réponse -->
				<div class="p-6">
					<label class="block text-sm font-medium text-gray-400 mb-2">Ta réponse :</label>
					<textarea 
						class="answer-input w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
						rows="4"
						placeholder="Écris ta réponse ici..."
					></textarea>
				</div>

				<!-- Feedback (caché par défaut) -->
				<div class="feedback-section hidden"></div>

				<!-- Actions -->
				<div class="p-6 flex items-center justify-between">
					<div class="flex items-center">
						<div class="flex flex-col ml-auto">
							<button
								type="button"
								class="show-hint px-4 py-2
								bg-linear-to-b from-amber-500 to-orange-600
								hover:from-amber-400 hover:to-orange-500
								text-white rounded-t-full rounded-l-full font-medium cursor-pointer
								transition-colors duration-300 ease-in-out">
								💡
							</button>

							<button
								type="button"
								class="dont-know px-4 py-2
								bg-linear-to-b from-rose-600 to-red-700
								hover:from-rose-500 hover:to-red-600
								text-white rounded-b-full rounded-l-full font-medium cursor-pointer
								transition-colors duration-300 ease-in-out">
								❔
							</button>
						</div>

						<div class="text-xs text-gray-300 text-center mt-1">
							<button
								type="button"
								class="show-context px-4 py-2
								bg-linear-to-b from-slate-600 to-slate-800
								hover:from-slate-500 hover:to-slate-700
								text-white font-medium rounded-r-full text-nowrap cursor-pointer
								transition-colors duration-300 ease-in-out">
								| Tricher |
							</button>
						</div>
					</div>
						
					<button type="button" class="submit-answer px-5 py-3 h-fit bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium cursor-pointer transition">
						Soumettre
					</button>
				</div>
			</div>
		</div>
	`;

	// Événements
	const closeBtn = overlay.querySelector(".close-card");
	const submitBtn = overlay.querySelector(".submit-answer");
	const hintBtn = overlay.querySelector(".show-hint");
	const contextBtn = overlay.querySelector(".show-context");
	const dontKnowBtn = overlay.querySelector(".dont-know");
	const answerInput = overlay.querySelector(".answer-input");
	const contextSection = overlay.querySelector(".context-section");
	const feedbackSection = overlay.querySelector(".feedback-section");

	// Fermer la carte avec animation améliorée
	const removeCard = async () => {
		const card = overlay.querySelector(".review-card");
		if (card) {
			card.classList.remove("scale-100", "opacity-100");
			card.classList.add("scale-90", "opacity-0");
		}
		overlay.classList.add("translate-x-full");
		setTimeout(() => {
			if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
		}, 500);
	};

	closeBtn.addEventListener("click", removeCard);

	// Afficher l'animation d'entrée améliorée
	setTimeout(() => {
		overlay.classList.remove("translate-x-full");
		const card = overlay.querySelector(".review-card");
		if (card) {
			card.classList.remove("scale-90", "opacity-0");
			card.classList.add("scale-100", "opacity-100");
		}

		// Appliquer les styles Tailwind au contenu Markdown
		overlay
			.querySelectorAll(".markdown-content")
			.forEach((el) => stylizeMarkdown(el));

		// Animation de "pop" pour les badges si c'est une question en cache
		if (cached) {
			const cacheBadgeEl = card.querySelector(".animate-pulse");
			if (cacheBadgeEl) {
				setTimeout(() => {
					cacheBadgeEl.classList.remove("animate-pulse");
				}, 2000);
			}
		}
	}, 10);

	// Soumettre la réponse
	submitBtn.addEventListener("click", async () => {
		const userAnswer = answerInput.value.trim();
		if (!userAnswer) {
			answerInput.classList.add("border-red-500");
			setTimeout(() => answerInput.classList.remove("border-red-500"), 2000);
			return;
		}

		submitBtn.disabled = true;
		submitBtn.textContent = "⏳ Évaluation en cours...";

		try {
			const evalResponse = await fetch(
				"http://localhost:5000/api/evaluate-answer",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						noteId: note.id,
						question: question,
						userAnswer: userAnswer,
					}),
				}
			);

			if (!evalResponse.ok) throw new Error("Erreur évaluation");
			const evaluation = await evalResponse.json();

			console.log("📊 Évaluation:", evaluation);

			// Enregistrer la révision dans le backend
			await fetch("http://localhost:5000/api/review-note", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: note.id,
					correct: evaluation.isCorrect,
				}),
			});

			// Afficher le feedback
			feedbackSection.classList.remove("hidden");
			if (evaluation.isCorrect) {
				feedbackSection.className =
					"feedback-section p-6 bg-green-900 border-t border-green-600";
				feedbackSection.innerHTML = `
					<div class="flex items-start gap-3">
						<svg class="w-6 h-6 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						<div class="flex-1">
							<h3 class="font-bold text-green-400 mb-2">✅ Correct ! Bien joué ! 🎉</h3>
							<p class="text-sm text-green-100">${escapeHtml(evaluation.feedback)}</p>
						</div>
					</div>
				`;
				showToast("Réponse correcte ! ✅", "success");
			} else {
				feedbackSection.className =
					"feedback-section p-6 bg-red-900 border-t border-red-600";
				feedbackSection.innerHTML = `
					<div class="flex items-start gap-3">
						<svg class="w-6 h-6 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
						</svg>
						<div class="flex-1">
							<h3 class="font-bold text-red-400 mb-2">❌ Pas tout à fait...</h3>
							<p class="text-sm text-red-100 mb-3">${escapeHtml(evaluation.feedback)}</p>
							<div class="p-3 bg-gray-800 rounded">
								<p class="text-sm font-medium text-gray-300">Rappel :</p>
								<p class="text-sm text-gray-400 mt-1">${escapeHtml(note.description)}</p>
							</div>
						</div>
					</div>
				`;
				showToast("Réponse incorrecte ❌", "error");
			}

			// Fermer automatiquement après 5 secondes
			setTimeout(removeCard, 5000);
		} catch (error) {
			console.error("❌ Erreur évaluation:", error);
			feedbackSection.classList.remove("hidden");
			feedbackSection.className =
				"feedback-section p-6 bg-red-900 border-t border-red-600";
			feedbackSection.innerHTML = `
				<div class="flex items-start gap-3">
					<svg class="w-6 h-6 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
					</svg>
					<div class="flex-1">
						<h3 class="font-bold text-red-400 mb-2">❌ Erreur</h3>
						<p class="text-sm text-red-100">${escapeHtml(error.message)}</p>
					</div>
				</div>
			`;
			submitBtn.disabled = false;
			submitBtn.textContent = "Soumettre ma réponse";
		}
	});

	// Afficher un indice
	hintBtn.addEventListener("click", async () => {
		hintBtn.disabled = true;
		hintBtn.textContent = "⏳ Génération...";
		try {
			const response = await fetch(`http://localhost:5000/api/hint/${note.id}`);
			if (!response.ok) throw new Error("Erreur génération indice");
			const data = await response.json();
			// Afficher l'indice dans le contexte
			contextSection.classList.remove("hidden");
			contextSection.innerHTML = `
				<h4 class="text-sm font-medium text-amber-400 mb-2">💡 Indice :</h4>
				<p class="text-amber-200 text-sm mb-3">${escapeHtml(data.hint)}</p>
				<h4 class="text-sm font-medium text-gray-400 mb-2">Contexte complet :</h4>
				<p class="text-gray-300 text-sm">${escapeHtml(note.description)}</p>
			`;
		} catch (error) {
			contextSection.classList.remove("hidden");
			contextSection.innerHTML = `
				<h4 class="text-sm font-medium text-amber-400 mb-2">💡 Indice :</h4>
				<p class="text-amber-200 text-sm mb-3">Relisez attentivement le contexte ci-dessous.</p>
				<h4 class="text-sm font-medium text-gray-400 mb-2">Contexte :</h4>
				<p class="text-gray-300 text-sm">${escapeHtml(note.description)}</p>
			`;
		} finally {
			hintBtn.disabled = false;
			hintBtn.textContent = "💡 Indice";
		}
	});

	// Afficher/masquer le contexte
	contextBtn.addEventListener("click", () => {
		contextSection.classList.toggle("hidden");
	});

	// Je ne sais pas
	dontKnowBtn.addEventListener("click", async () => {
		feedbackSection.classList.remove("hidden");
		feedbackSection.className =
			"feedback-section p-6 bg-gray-700 border-t border-gray-600";
		feedbackSection.innerHTML = `
			<div class="flex items-start gap-3">
				<span class="text-2xl">🤔</span>
				<div class="flex-1">
					<h3 class="font-bold text-gray-200 mb-2">Pas de souci !</h3>
					<div class="p-3 bg-gray-800 rounded">
						<p class="text-sm font-medium text-gray-300">Réponse attendue :</p>
						<p class="text-sm text-gray-400 mt-1">${escapeHtml(note.description)}</p>
					</div>
				</div>
			</div>
		`;
		setTimeout(removeCard, 5000);
	});

	return overlay;
}

// =====================
// Mock de la fonction createReviewCard pour l'afficher automatiquement au chargement
// ===================
// document.addEventListener("DOMContentLoaded", () => {
// 	const testNote = {
// 		id: "test-note-123",
// 		aiTags: ["hir0rameel/qwen-claude"],
// 		title: "Test JavaScript",
// 		description:
// 			"En JavaScript, les fonctions renvoient 'undefined' par défaut si aucun return n'est spécifié.",
// 		intensity: "moderate",
// 	};
// 	const testQuestion =
// 		"Que renvoie une fonction JavaScript si elle n'a pas de déclaration return ?";
// 	const testModel = "hir0rameel/qwen-claude";

// 	const reviewCard = createReviewCard(testNote, testQuestion, testModel);
// 	document.body.appendChild(reviewCard);
// });

// =====================

// Fonction utilitaire pour échapper HTML
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

// =====================
// Initialisation
// =====================
// Initialiser le toggle des interrogations
initInterrogationsToggle("toggle-interrogations");

// =====================
// Bouton de test de l'IA (interrogation aléatoire)
// =====================
const testToastBtn = document.getElementById("test-toast-btn");
if (testToastBtn) {
	testToastBtn.addEventListener("click", async () => {
		console.log("🚀 Démarrage du test d'interrogation aléatoire...");
		showToast("🎲 Sélection d'une note aléatoire...");

		const startTime = performance.now();

		try {
			// 1. Récupérer toutes les notes
			console.log("📥 Récupération de toutes les notes...");
			const notesResponse = await fetch("http://localhost:5000/api/notes");

			if (!notesResponse.ok) {
				throw new Error("Erreur lors de la récupération des notes");
			}

			const { notes } = await notesResponse.json();
			console.log(`📚 ${notes.length} notes disponibles`);

			if (notes.length === 0) {
				throw new Error("Aucune note disponible. Créez d'abord une note !");
			}

			// 2. Choisir une note aléatoire
			const randomNote = notes[Math.floor(Math.random() * notes.length)];
			console.log("🎲 Note sélectionnée:", randomNote);

			// 3. Générer une interrogation (utilise automatiquement le cache si disponible)
			console.log("🤖 Demande de question (cache ou génération)...");
			const loadingToast = showToast(
				"⏳ Chargement de la question...",
				"info",
				10000
			);

			const questionResponse = await fetch(
				`http://localhost:5000/api/generate-question/${randomNote.id}`
			);

			if (!questionResponse.ok) {
				const errorData = await questionResponse.json().catch(() => ({}));
				console.error("❌ Erreur génération question:", errorData);

				// Gestion d'erreur élégante avec fallback
				if (errorData.message && errorData.message.includes("timeout")) {
					throw new Error(
						"⏱️ Timeout: L'IA met trop de temps à répondre. Réessayez ou vérifiez qu'Ollama est démarré."
					);
				} else if (errorData.message && errorData.message.includes("model")) {
					throw new Error(
						"🤖 Modèle IA introuvable. Vérifiez que les modèles sont installés avec 'ollama pull'."
					);
				} else {
					throw new Error(
						errorData.error || errorData.message || "Erreur génération question"
					);
				}
			}

			const { question, model, cached, generatedAt } =
				await questionResponse.json();
			const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);

			// Vérifier si la question est valide
			if (!question || question.trim() === "") {
				console.error("❌ Question vide reçue");
				throw new Error("L'IA n'a pas pu générer de question");
			}

			console.log(`🤖 Modèle utilisé: ${model}`);
			console.log(
				`💾 Question depuis cache: ${cached ? "Oui ⚡" : "Non (générée)"}`
			);
			console.log(`⏱️ Temps de chargement: ${loadTime}s`);
			console.log("❓ Question:", question);
			console.log("✅ Chargement réussi !");

			// Afficher toast de succès avec info cache
			if (cached) {
				showToast(
					`⚡ Question chargée instantanément (${loadTime}s)`,
					"success",
					2000
				);
			} else {
				showToast(`✅ Question générée (${loadTime}s)`, "success", 2000);
			}

			// 4. Afficher la carte d'interrogation avec info cache
			const reviewCard = createReviewCard(
				randomNote,
				question,
				model,
				cached,
				generatedAt
			);
			document.body.appendChild(reviewCard);
		} catch (error) {
			console.error("❌ Erreur test IA:", error);

			// Afficher modal d'erreur élégante avec option de retry
			showErrorModal(error, {
				title: "Erreur de chargement",
				onRetry: async () => {
					// Retry en rechargeant la page ou en relançant la fonction
					location.reload();
				},
				retryText: "Recharger la page",
			});
		}
	});
}

// Supprimer l'appel de test automatique
// createReviewCard(...);
