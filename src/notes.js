import { loadNotes } from "./utils/loadNotes.js";
import { createNoteCard } from "./components/noteCard.js";
import { showExpandedCard } from "./utils/expandedCard.js";
import { flashCard } from "./components/flashCard.js";

/**
 * Affiche les notes dans la section dédiée
 */
async function displayNotes() {
	const notesField = document.getElementById("notes-field");
	const notes = await loadNotes();

	notesField.innerHTML = "";

	if (notes.length === 0) {
		notesField.innerHTML = `
            <div class="text-center py-12">
                <p class="text-neutral-400 text-lg">Aucune note à afficher</p>
                <p class="text-neutral-500 text-sm mt-2">Créez votre première note pour commencer à réviser !</p>
            </div>
        `;
		return;
	}

	notes.forEach((note) => {
		const noteCard = createNoteCard(note);
		notesField.appendChild(noteCard);
	});

	console.log(`📚 ${notes.length} notes affichées`);
}

/**
 * Gère l'agrandissement d'une carte de note
 */
function handleExpandCard(event) {
	const { note } = event.detail;
	console.log("🔍 Agrandissement de la carte:", note.title);
	showExpandedCard(note);
}

/**
 * Gère le démarrage d'une révision
 */
function handleStartReview(event) {
	const note = event.detail;
	console.log("🎯 Démarrage de la révision pour:", note.title);
	flashCard(note);
}

// ==================
// Événements globaux
// ==================

// Écouter l'événement d'agrandissement de carte
window.addEventListener("expandNoteCard", handleExpandCard);

// Écouter l'événement de démarrage de révision
window.addEventListener("startReview", handleStartReview);

// Charger et afficher les notes au chargement de la page
window.addEventListener("DOMContentLoaded", displayNotes);
