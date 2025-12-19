/**
 * Système d'affichage automatique de cartes de révision
 * Affiche une carte aléatoire toutes les 15 secondes
 */

import { flashCard } from "./components/flashCard.js";

// Configuration
const INTERVAL_MS = 15000; // 15 secondes

// État interne
let timerId = null; // ID de l'intervalle
let isCardDisplayed = true; // Indique si une carte est actuellement affichée
let currentCard = null; // Référence à la carte affichée

/**
 * Récupère une note aléatoire à réviser depuis l'API
 * @param {number} intensity - L'intensité des notes à récupérer (1, 2, 3)
 * @returns {Promise<Object|null>} La note sélectionnée ou null si aucune
 */
async function fetchRandomNote(intensity = 2) {
	try {
		const response = await fetch(
			`http://localhost:3000/api/notes/review?intensity=${intensity}`
		);
		const data = await response.json();

		if (data.notes && data.notes.length > 0) {
			// Sélectionner une note aléatoire parmi celles disponibles
			const randomIndex = Math.floor(Math.random() * data.notes.length);
			return data.notes[randomIndex];
		}

		console.log("ℹ️ [AutoReview] Aucune note à réviser");
		return null;
	} catch (error) {
		console.error("❌ [AutoReview] Erreur récupération note:", error);
		return null;
	}
}

/**
 * Affiche une carte et met en pause l'intervalle
 */
async function showCard() {
	if (isCardDisplayed) return; // Ne pas afficher si déjà une carte

	console.log("🎯 [AutoReview] Affichage d'une carte aléatoire...");

	const note = await fetchRandomNote(); // Utilise l'intensité par défaut
	if (!note) {
		console.log("⏭️ [AutoReview] Aucune carte disponible, réessai dans 15s");
		return;
	}

	isCardDisplayed = true;

	// Afficher la carte
	currentCard = flashCard(note);

	// Écouter la fermeture de la carte
	const overlay = document.getElementById("flash-card-overlay");
	if (overlay) {
		// Écouter aussi le bouton de fermeture
		const closeBtn = overlay.querySelector("#close-button");
		if (closeBtn) {
			closeBtn.addEventListener("click", handleCardClose, { once: true });
		}
	}

	console.log("⏸️ [AutoReview] Intervalle mis en pause");
}

/**
 * Gère la fermeture de la carte
 */
function handleCardClose() {
	console.log("🔄 [AutoReview] Carte fermée, relance de l'intervalle");
	isCardDisplayed = false;
	currentCard = null;
}

/**
 * Démarre le système automatique
 */
export function startAutoReview() {
	if (timerId) {
		console.warn("⚠️ [AutoReview] Déjà actif");
		return;
	}

	console.log("🚀 [AutoReview] Démarrage (intervalle: 15s)");

	// Premier affichage immédiat
	// showCard();

	// Puis toutes les 15 secondes
	timerId = setInterval(() => {
		if (!isCardDisplayed) {
			showCard();
		}
	}, INTERVAL_MS);
}

/**
 * Arrête le système automatique
 */
export function stopAutoReview() {
	if (timerId) {
		clearInterval(timerId);
		timerId = null;
		console.log("🛑 [AutoReview] Arrêté");
	}
}

// Démarrage automatique
startAutoReview();
