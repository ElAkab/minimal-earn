import { loadNotes } from "./utils/loadNotes.js";
import { createNoteCard } from "./utils/noteCard.js";
import { showExpandedCard } from "./utils/expandedCard.js";
import { flashCard } from "./components/flashCard.js";
import { startAutoReview } from "./init.js";
import { getIntensityColor } from "./utils/constants.js";

startAutoReview();

// ==================================
// Gestion du filtrage par intensité
// ==================================

const radios = document.querySelectorAll(".intensity-radio");

radios.forEach((radio) => {
	radio.addEventListener("change", () => {
		// Retirer le style actif de tous les labels
		radios.forEach((r) => {
			const label = document.querySelector(`label[for="${r.id}"]`);
			label.classList.remove(
				"bg-blue-600/40",
				"bg-amber-500/40",
				"bg-red-600/40",
				"bg-gray-600/50",
				"text-white",
				"font-bold",
				"border-blue-500",
				"border-amber-500",
				"border-red-500",
				"border-gray-500",
				"ring-2",
				"ring-offset-2",
				"ring-offset-gray-800"
			);
		});

		// Ajouter le style actif au label sélectionné
		const selectedLabel = document.querySelector(`label[for="${radio.id}"]`);
		const value = radio.value; // "1", "2", "3" ou "all"

		if (value === "all") {
			selectedLabel.classList.add(
				"bg-gray-600/50",
				"border-gray-500",
				"text-white",
				"font-bold",
				"ring-2",
				"ring-gray-500/50",
				"ring-offset-2",
				"ring-offset-gray-800"
			);
		} else if (value === "1") {
			selectedLabel.classList.add(
				"bg-blue-600/40",
				"border-blue-500",
				"text-white",
				"font-bold",
				"ring-2",
				"ring-blue-500/50",
				"ring-offset-2",
				"ring-offset-gray-800"
			);
		} else if (value === "2") {
			selectedLabel.classList.add(
				"bg-amber-500/40",
				"border-amber-500",
				"text-white",
				"font-bold",
				"ring-2",
				"ring-amber-500/50",
				"ring-offset-2",
				"ring-offset-gray-800"
			);
		} else if (value === "3") {
			selectedLabel.classList.add(
				"bg-red-600/40",
				"border-red-500",
				"text-white",
				"font-bold",
				"ring-2",
				"ring-red-500/50",
				"ring-offset-2",
				"ring-offset-gray-800"
			);
		}

		console.log(
			`🎯 Filtre sélectionné: ${
				value === "all" ? "Tous" : "Intensité " + value
			}`
		);

		// Appliquer le filtre d'intensité
		const intensityParam = value === "all" ? "" : value;
		displayNotes(intensityParam);
	});
});

// ==================================

/**
 * Affiche les notes dans la section dédiée
 * @param {string} intensity - Intensité à filtrer ("1", "2", "3", "all" ou "")
 */
async function displayNotes(intensity = "") {
	const notesField = document.getElementById("notes-field");
	if (!notesField) {
		console.error("❌ Conteneur de notes introuvable");
		return;
	}

	// Afficher un indicateur de chargement
	notesField.innerHTML =
		'<div class="text-center py-12 text-gray-400">Chargement...</div>';

	try {
		const notes = await loadNotes(intensity);

		// Vider le conteneur
		notesField.innerHTML = "";

		// Si aucune note
		if (notes.length === 0) {
			const filterText =
				intensity && intensity !== "all"
					? ` avec l'intensité ${intensity}`
					: "";
			notesField.innerHTML = `
				<div class="col-span-full text-center py-12">
					<p class="text-neutral-400 text-lg">Aucune note à afficher${filterText}</p>
					<p class="text-neutral-500 text-sm mt-2">Créez votre première note pour commencer à réviser !</p>
				</div>
			`;
			return;
		}

		// Afficher les notes
		notes.forEach((note) => {
			const noteCard = createNoteCard(note);
			notesField.appendChild(noteCard);
		});

		console.log(`✅ ${notes.length} notes affichées`);
	} catch (error) {
		console.error("❌ Erreur lors de l'affichage des notes:", error);
		notesField.innerHTML = `
			<div class="col-span-full text-center py-12">
				<p class="text-red-400 text-lg">❌ Erreur lors du chargement des notes</p>
				<p class="text-neutral-500 text-sm mt-2">Vérifiez que le serveur est démarré</p>
			</div>
		`;
	}
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
window.addEventListener("DOMContentLoaded", () => displayNotes(""));

// Bouton de suppression
const deleteBtn = document.getElementById("deleteBtn");
if (deleteBtn) {
	deleteBtn.addEventListener("click", deleteNotes);
}
