import { loadNotes } from "./utils/loadNotes.js";
import { createNoteCard } from "./utils/noteCard.js";
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

/**
 * Supprime toutes les notes via une requête DELETE
 */
async function deleteNotes() {
	if (
		!confirm(
			"⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les notes ? Cette action est irréversible."
		)
	) {
		return;
	}

	try {
		const response = await fetch("http://localhost:3000/api/notes", {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`Erreur HTTP: ${response.status}`);
		}

		console.log("✅ Toutes les notes ont été supprimées");
		displayNotes();
		alert("✅ Toutes les notes ont été supprimées");
	} catch (error) {
		console.error("❌ Erreur lors de la suppression des notes:", error);
		alert("❌ Erreur lors de la suppression des notes");
	}
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

// Bouton de suppression
const deleteBtn = document.getElementById("deleteBtn");
if (deleteBtn) {
	deleteBtn.addEventListener("click", deleteNotes);
}
