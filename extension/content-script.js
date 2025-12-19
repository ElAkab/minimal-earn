/**
 * ========================================================
 * CONTENT-SCRIPT.JS - Script injecté dans chaque page web
 * ========================================================
 *
 * Rôle : "Agent infiltré" dans les pages web (YouTube, Gmail, etc.)
 * - Écoute les messages du background.js
 * - Affiche les flashCards en overlay sur la page
 * - Réutilise la logique de init.js (autoReview) et flashCard.js
 */

// ==============================================
// UTILITAIRES COPIÉS DE constants.js
// ==============================================
const INTENSITY_TEXT_MAP = {
	1: "Chill",
	2: "Sérieux",
	3: "Nécessaire",
};

const COLOR_CLASSES = {
	blue: "color: #3b82f6", // Tailwind : blue-500
	amber: "color: #f59e0b", // Tailwind : amber-500
	red: "color: #ef4444", // Tailwind : red-500
};

function getIntensityLabel(intensity) {
	return INTENSITY_TEXT_MAP[intensity] || "Inconnu";
}

function getColorStyle(color) {
	return COLOR_CLASSES[color] || COLOR_CLASSES.amber;
}

// ==============================================
// CACHE POUR LA NOTE EN COURS
// ==============================================
let payload = {
	id: null,
	title: null,
	content: null,
	date: null,
	AImessages: [],
	userMessages: [],
};

// Remplissage du payload pour le suivi (à réviser plus tard)
// payload = {
// 	id: note.id || crypto.randomUUID(),
// 	title: title,
// 	content: content,
// 	date: note.date || Date.now(),
// 	AImessages: [],
// 	userMessages: [],
// };

// ==============================================
// STYLES CSS DE LA FLASHCARD
// ==============================================
const CARD_STYLES = `
	<style>
		/* === ANIMATION === */
		@keyframes slideIn {
			from { transform: translateX(100%); opacity: 0; } /* Départ hors écran à droite */
			to { transform: translateX(0); opacity: 1; } /* Arrivée à la position normale */
		}
		@keyframes pulse {
			0% { opacity: 1; }
			50% { opacity: 0.5; }
			100% { opacity: 1; }
		}

		/* === GLOBAL === */
		#flash-card-overlay * {
			box-sizing: border-box;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
		}

		#flash-card-overlay .sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0); /* Sert à cacher visuellement mais garder accessible */
		}

		/* === OVERLAY === */
		#flash-card-overlay {
			position: fixed;
			width: 660px;
			bottom: 0;
			right: 0;
			z-index: 999999;
			animation: slideIn 0.4s ease-out;
		}

		/* === TOAST === */
		#flash-card-overlay .toast {
			background: #000;
			border: 4px solid #fff;
			width: 100%;
			max-width: 660px;
			max-height: 40rem;
			padding: 1rem;
			border-radius: 1.5rem;
			display: flex;
			flex-direction: column;
			align-items: center;
			position: relative;
			box-shadow: 0 20px 60px rgba(0,0,0,0.8);
			color: white;
		}

		/* === HEADER === */
		#flash-card-overlay .toast-header {
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0.5rem;
		}

		#flash-card-overlay .toast-intensity {
			font-size: 1rem;
			font-weight: bold;
			padding: 0.6rem;
			border-radius: 0.5rem;
		}

		#flash-card-overlay .toast-title {
			font-size: 2rem;
			font-weight: 800;
			margin: 0 auto;
		}

		/* === CLOSE BUTTON === */
		#flash-card-overlay .close-button {
			height: 3rem;
			width: 3rem;
			border-radius: 50%;
			background: transparent;
			border: none;
			cursor: pointer;
			color: #aaa;
			transition: background 0.2s, color 0.2s;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		#flash-card-overlay .close-button:hover {
			background: #333;
			color: #fff;
		}

		/* === CONTENT === */
		#flash-card-overlay .toast-divider {
			width: 100%;
			border: none;
			border-top: 1px solid #333;
		}

		#flash-card-overlay .toast-content {
			display: none;
			background: #111;
			width: 100%;
			max-height: 6rem; // Correspond à peu près à 3 lignes
			padding: 1rem;
			text-align: center;
			overflow-y: auto;
			color: #ccc;
			font-size: 15px;
			font-style: italic;
			line-height: 1.7;
		}

		#flash-card-overlay .toast-question {
			text-align: center;
			overflow-y: auto;
			color: #e5e5e5;
			font-size: 16px;
			font-weight: 500;
			line-height: 1.7;
			margin-top: 1rem;
		}

		/* === MESSAGES === */
		#flash-card-overlay .messages-container {
			width: 100%;
			max-height: 12rem;
			overflow-y: auto;
			margin: 1rem 0;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		#flash-card-overlay .user-message {
			background: #222;
			padding: 10px 14px;
			width: 100%;
			text-align: center;
			border-radius: 12px;
			color: #fff;
			font-size: 14px;
			line-height: 1.5;
		}

		/* === CHAT INPUT === */
		#flash-card-overlay .chat-input {
			display: flex;
			width: 100%;
			margin-top: .5rem;
		}

		#flash-card-overlay .chat-input textarea {
			flex: 1;
			background: #222;
			border: 1px solid #444;
			color: white;
			padding: 1.5rem;
			border-radius: 15px 0 0 15px;
			resize: none;
		}

		#flash-card-overlay .send-button {
			padding: 0.5rem 1.5rem;
			background: #333;
			border-radius: 0 15px 15px 0;
			border: none;
			cursor: pointer;
			color: white;
			transition: 0.3s ease;
		}

		#flash-card-overlay .send-button:hover {
			background: #555;
		}

		/* === ACTIONS === */
		#flash-card-overlay .actions-wrapper {
			width: 100%;
			margin: 1rem 0;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		#flash-card-overlay .actions-container {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		#flash-card-overlay .actions-left {
			display: flex;
			flex-direction: column;
			margin-left: auto;
		}

		#flash-card-overlay .actions-right {
			margin-top: 0.25rem;
			font-size: 0.75rem;
			color: #d1d5db;
			text-align: center;
		}

		/* === ACTION BUTTONS === */
		#flash-card-overlay .action-btn {
			padding: 0.5rem 1rem;
			color: white;
			font-weight: 500;
			cursor: pointer;
			border: none;
			white-space: nowrap;
			transition: background 0.3s ease-in-out;
		}

		#flash-card-overlay .hint-btn {
			background: linear-gradient(to bottom, #f59e0b, #ea580c);
			border-radius: 9999px 9999px 0 9999px;
		}

		#flash-card-overlay .hint-btn:hover {
			background: linear-gradient(to bottom, #fbbf24, #f97316);
		}

		#flash-card-overlay .dont-know-btn {
			background: linear-gradient(to bottom, #e11d48, #b91c1c);
			border-radius: 9999px 0 9999px 9999px;
		}

		#flash-card-overlay .dont-know-btn:hover {
			background: linear-gradient(to bottom, #fb7185, #ef4444);
		}

		#flash-card-overlay .context-btn {
			background: linear-gradient(to bottom, #475569, #1e293b);
			border-radius: 0 9999px 9999px 0;
		}

		#flash-card-overlay .context-btn:hover {
			background: linear-gradient(to bottom, #64748b, #334155);
		}

		#flash-card-overlay .hidden {
			display: none;
		}
	</style>
`;

// ==============================================
// GÉNÉRATION DU HTML DE LA FLASHCARD
// ==============================================
function generateCardHTML(note) {
	const { title, content, intensity, color } = note;
	const intensityText = getIntensityLabel(intensity);
	const colorStyle = getColorStyle(color);

	// Retourner le HTML complet de la carte
	return `
		${CARD_STYLES}
		<div id="flash-card-overlay">
			<article class="toast" role="alert">
				<!-- Header -->
				<div class="toast-header">
					<span class="toast-intensity" style="${colorStyle}">
						${intensityText}
					</span>
					<h3 class="toast-title">${title}</h3>
					<button
						id="close-button"
						type="button"
						class="close-button"
						aria-label="Close"
					>
						<span class="sr-only">Close</span>
						<svg
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18 17.94 6M18 18 6.06 6"
							/>
						</svg>
					</button>
				</div>

				<hr class="toast-divider" />

				<!-- Quiz section -->
				<p id="ai-question" class="toast-question">
					La question générée par l'IA apparaîtra ici
				</p>

				<!-- Affichage de la note (grâce au bouton "Tricher") -->
				<p id="content" class="toast-content">${content}</p>

				<!-- Zone de messages -->
				<div id="messages-container" class="messages-container"></div>

				<!-- Input zone -->
				<div class="chat-input">
					<textarea
						id="chat"
						rows="1"
						placeholder="Votre réponse..."
					></textarea>
					<button id="send-button" type="button" class="send-button">
						<svg
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							fill="none"
							viewBox="0 0 24 24"
							style="transform: rotate(90deg);"
						>
							<path
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="m12 18-7 3 7-18 7 18-7-3Zm0 0v-5"
							/>
						</svg>
						<span class="sr-only">Send message</span>
					</button>
				</div>

				<!-- Actions -->
				<div class="actions-wrapper">
					<div id="quiz-actions" class="actions-container">
						<div class="actions-left">
							<button
								id="hint-button"
								type="button"
								class="action-btn hint-btn"
								aria-label="Hint"
							>
								💡
							</button>

							<button
								id="dont-know-button"
								type="button"
								class="action-btn dont-know-btn"
								aria-label="I don't know"
							>
								❔
							</button>
						</div>

						<div class="actions-right">
							<button
								id="cheat-button"
								type="button"
								class="action-btn context-btn"
							>
								| Tricher |
							</button>
						</div>
					</div>
				</div>
			</article>
		</div>
	`;
}

// ==============================================
// AFFICHAGE DE LA FLASHCARD
// ==============================================
function showFlashCard(note) {
	console.log("🎯 [Content] Affichage de la flashCard :", note.title);

	// Vérifier qu'il n'y a pas déjà une carte affichée
	const existing = document.getElementById("flash-card-overlay");
	if (existing) {
		console.log("⚠️ [Content] Une carte est déjà affichée");

		return;
	}

	// 1. Générer et insérer le HTML (qui contient déjà l'overlay)
	const cardHTML = generateCardHTML(note);
	document.body.insertAdjacentHTML("beforeend", cardHTML);

	// 2. Attacher les événements
	attachEventListeners(note);

	console.log("✅ [Content] FlashCard affichée");
}

// ==============================================
// GESTION DES ÉVÉNEMENTS
// ==============================================
function attachEventListeners(note) {
	// Bouton fermer
	const closeBtn = document.getElementById("close-button");
	if (closeBtn) {
		closeBtn.addEventListener("click", closeFlashCard);
	}

	// Bouton "Je sais pas"
	const dontKnowBtn = document.getElementById("dont-know-button");
	if (dontKnowBtn) {
		dontKnowBtn.addEventListener("click", () => {
			console.log("❌ [Content] Je sais pas cliqué");
			updateContent("Réponse attendue : [À intégrer avec l'IA plus tard]");
			// TODO: Appeler l'IA pour afficher la réponse
		});
	}

	// Bouton "Indice"
	const hintBtn = document.getElementById("hint-button");
	if (hintBtn) {
		hintBtn.addEventListener("click", () => {
			console.log("💡 [Content] Indice cliqué");
			updateContent("Indice : [À générer par l'IA plus tard]");
			// TODO: Appeler l'IA pour générer un indice
		});
	}

	// Bouton "Tricher"
	const cheatBtn = document.getElementById("cheat-button");
	if (cheatBtn) {
		let triggered = false;
		cheatBtn.addEventListener("click", () => {
			console.log("📖 [Content] Tricher cliqué");

			const contentEl = document.getElementsByClassName("toast-content")[0];
			if (contentEl) {
				contentEl.style.display = !triggered ? "block" : "none";
				triggered = !triggered;
			}
		});
	}

	// Zone de texte et bouton envoyer
	const textarea = document.getElementById("chat");
	const sendBtn = document.getElementById("send-button");

	if (textarea && sendBtn) {
		const handleSend = () => {
			const message = textarea.value.trim();
			if (message) {
				console.log("📝 [Content] Message envoyé :", message);

				// Ajouter le message utilisateur à l'historique
				addMessage(message);

				// Effacer le champ de texte
				textarea.value = "";

				// Appeler la fonction mock de réponse IA
				// TODO: Remplacer par un vrai appel à l'API backend
				const contentEl = document.getElementById("ai-question");
				if (contentEl) {
					mockIAResponse(message, contentEl);
				}
			}
		};

		sendBtn.addEventListener("click", handleSend);
		textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		});
	}
}

// ==============================================
// MISE À JOUR DU CONTENU
// ==============================================
function updateContent(text) {
	const contentEl = document.getElementById("ai-question");
	if (contentEl) {
		contentEl.innerHTML = text;
		contentEl.style.display = "block";
	}
}

// ==============================================
// AJOUT D'UN MESSAGE UTILISATEUR
// ==============================================
function addMessage(message) {
	const messagesContainer = document.getElementById("messages-container");
	const contentEl = document.getElementsByClassName("toast-content")[0];

	if (contentEl.style.display === "block") {
		contentEl.style.display = "none";
		contentEl.remove();
	}

	if (messagesContainer) {
		// Vider complètement le conteneur pour afficher uniquement le nouveau message
		messagesContainer.innerHTML = "";

		// Ajouter un séparateur avant le message
		const separator = document.createElement("hr");
		separator.style.cssText =
			"margin: 0.5rem 0; border: none; border-top: 1px solid #444;";
		messagesContainer.appendChild(separator);

		// Afficher la zone de messages
		messagesContainer.style.display = "flex";

		// Ajouter le nouveau message utilisateur
		const messageEl = document.createElement("div");
		messageEl.className = "user-message";
		messageEl.textContent = message;
		messagesContainer.appendChild(messageEl);

		// Remplacer l'historique dans le payload par le nouveau message uniquement
		payload.userMessages = [message];

		// Scroll automatique (utile si le message est long)
		messagesContainer.scrollTop = messagesContainer.scrollHeight;
	}
}

// ==============================================
// SIMULATION DE RÉPONSE IA | userMessage : message utilisateur, descriptionElement : élément où afficher la réponse
// ==============================================
function mockIAResponse(userMessage, descriptionElement) {
	// Afficher un indicateur de chargement
	// "pulse" est défini dans les styles CSS plus haut pour une animation de pulsation
	updateDescription(
		descriptionElement,
		'<span style="animation: pulse 1.5s infinite;">L\'IA réfléchit...</span>'
	);

	// Simuler un délai de réponse
	setTimeout(() => {
		const iaMessage = `Réponse IA à : "${userMessage}"`;
		console.log("💬 [Content] Réponse IA générée :", iaMessage);

		// Mettre à jour le contenu avec la réponse de l'IA
		updateContent(iaMessage);

		// Enregistrer dans le payload
		// Reset du cache payload
		payload = {
			id: null,
			title: null,
			content: null,
			date: null,
			AImessages: [],
			userMessages: [],
		};

		overlay.remove();
		console.log("🗑️ [Content] FlashCard fermée (payload réinitialisé)");
	}, 2000); // 2 secondes de délai simulé
}

function updateDescription(descriptionElement, iaMessage) {
	descriptionElement.innerHTML = iaMessage;
}

// ==============================================
// FERMETURE DE LA FLASHCARD
// ==============================================
function closeFlashCard() {
	const overlay = document.getElementById("flash-card-overlay");
	if (overlay) {
		overlay.remove();
		console.log("🗑️ [Content] FlashCard fermée");
	}
}

// ==============================================
// ÉCOUTE DES MESSAGES DU BACKGROUND
// ==============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("📨 [Content] Message reçu :", message.type);

	if (message.type === "SHOW_FLASHCARD") {
		showFlashCard(message.note);
		sendResponse({ success: true });
	}

	return true;
});

// ==============================================
// INITIALISATION
// ==============================================
console.log("⚡ [Content] Mind Stimulator content-script chargé");
