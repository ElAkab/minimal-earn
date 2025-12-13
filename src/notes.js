// Logique de la page notes.html
import { initInterrogationsToggle } from "./config.js";

const API_URL = "http://localhost:5000/api";

let allNotes = [];
let currentFilter = "all";

// Éléments DOM
const notesField = document.getElementById("notes-field");
const noNotesMessage = document.getElementById("no-notes-message");
const filterBtns = document.querySelectorAll(".filter-btn");
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const cancelEditBtn = document.getElementById("cancel-edit");

// =====================
// Récupération des notes depuis l'API
// =====================
async function fetchNotes() {
	try {
		const response = await fetch(`${API_URL}/notes`);
		if (!response.ok)
			throw new Error("Erreur lors de la récupération des notes");
		const data = await response.json();
		allNotes = data.notes || [];
		console.log(allNotes);
		renderNotes();
	} catch (error) {
		console.error("Error fetching notes:", error);
		notesField.innerHTML = `<p class="text-red-500 col-span-full text-center">Erreur de chargement des notes</p>`;
	}
}

// =====================
// Affichage des notes
// =====================
function renderNotes() {
	const filteredNotes =
		currentFilter === "all"
			? allNotes
			: allNotes.filter(
					(note) => note.aiTags && note.aiTags.includes(currentFilter)
			  );

	notesField.innerHTML = "";

	if (filteredNotes.length === 0) {
		noNotesMessage.classList.remove("hidden");
		return;
	}

	noNotesMessage.classList.add("hidden");

	filteredNotes.forEach((note) => {
		const noteCard = createNoteCard(note);
		notesField.appendChild(noteCard);
	});
}

// =====================
// Création d'une carte note
// =====================
function createNoteCard(note) {
	const card = document.createElement("article");
	card.className =
		"relative flex flex-col bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition max-h-80 overflow-hidden";
	card.dataset.noteId = note.id;

	// Badge intensité
	const intensityColors = {
		chill: "bg-blue-500",
		moderate: "bg-amber-500",
		intensive: "bg-red-500",
	};

	// Couleurs pour les tags IA
	const aiTagColors = {
		"hir0rameel/qwen-claude": "text-orange-500",
		"gpt-oss": "text-cyan-500",
	};

	// Tags AI
	const aiTagsHTML = note.aiTags
		? note.aiTags
				.map(
					(tag) =>
						`<span class="inline-block ${
							aiTagColors[tag] || "text-white"
						} text-sm font-extrabold px-2 py-1 rounded">${tag}</span>`
				)
				.join(" ")
		: "";

	card.innerHTML = `
		<div class="flex justify-between items-start mb-3">
			<div class="flex justify-between items-center">
				<span class="${
					intensityColors[note.intensity] || intensityColors.moderate
				} text-xs px-2 py-1 rounded text-white font-semibold">
					${note.intensity || "moderate"}
				</span>
				${
					note.aiModel
						? `<span class="bg-purple-600 text-xs px-2 py-1 rounded text-white font-semibold">
				🤖 ${note.aiModel}
				</span>`
						: ""
				}
				
			</div>
			${aiTagsHTML ? `<div>${aiTagsHTML}</div>` : ""}
			<div class="flex gap-2">
				<button
					onclick="editNote(${note.id})"
					class="text-blue-400 hover:text-blue-300 transition"
					title="Modifier"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				</button>
				<button
					onclick="deleteNote(${note.id})"
					class="text-red-400 hover:text-red-300 transition"
					title="Supprimer"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
				</button>
			</div>
		</div>
		
		${
			note.title
				? `<h3 class="text-xl font-bold mb-2">${escapeHtml(note.title)}</h3>`
				: ""
		}
		
		<p class="text-gray-300 mb-3">${escapeHtml(note.description || "")}</p>

		<!-- Effet dégradé en bas pour masquer le texte débordant -->
		<div class="absolute bottom-0 left-0 right-0 p-3 h-16 bg-gray-900/65 pointer-events-none rounded-b-lg">
			<span>Créé: ${formatDate(note.createdAt)}</span>
			<span class="pb-5">Révisions: ${note.reviewCount || 0}</span>
			${
				note.nextReviewAt
					? `<div class="text-xs text-gray-400 mt-1">Prochaine révision: ${formatDate(
							note.nextReviewAt
					  )}</div>`
					: ""
			}
		</div>
		
		
	`;

	return card;
}

// =====================
// Supprimer une note
// =====================
window.deleteNote = async function (id) {
	if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;

	try {
		const response = await fetch(`${API_URL}/notes/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) throw new Error("Erreur lors de la suppression");

		// Retirer de la liste locale et re-render
		allNotes = allNotes.filter((note) => note.id !== id);
		renderNotes();
	} catch (error) {
		console.error("Error deleting note:", error);
		alert("Erreur lors de la suppression de la note");
	}
};

// =====================
// Éditer une note
// =====================
window.editNote = function (id) {
	const note = allNotes.find((n) => n.id === id);
	if (!note) return;

	// Remplir le formulaire d'édition
	document.getElementById("edit-note-id").value = note.id;
	document.getElementById("edit-title").value = note.title || "";
	document.getElementById("edit-description").value = note.description || "";

	// Sélectionner l'intensité
	const intensityRadio = document.querySelector(
		`input[name="edit-intensity"][value="${note.intensity || "moderate"}"]`
	);
	if (intensityRadio) intensityRadio.checked = true;

	// Afficher le modal (retirer hidden, ajouter flex)
	editModal.classList.remove("hidden");
	editModal.classList.add("flex");
};

// =====================
// Sauvegarder l'édition
// =====================
editForm.addEventListener("submit", async (e) => {
	e.preventDefault();

	const id = Number(document.getElementById("edit-note-id").value);
	const title = document.getElementById("edit-title").value;
	const description = document.getElementById("edit-description").value;
	const intensity = document.querySelector(
		'input[name="edit-intensity"]:checked'
	)?.value;

	if (!description) {
		alert("La description est obligatoire");
		return;
	}

	try {
		const response = await fetch(`${API_URL}/notes/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title, description, intensity }),
		});

		if (!response.ok) throw new Error("Erreur lors de la mise à jour");

		const data = await response.json();

		// Mettre à jour la liste locale
		const idx = allNotes.findIndex((n) => n.id === id);
		if (idx !== -1) allNotes[idx] = data.note;

		renderNotes();
		closeEditModal();
	} catch (error) {
		console.error("Error updating note:", error);
		alert("Erreur lors de la mise à jour de la note");
	}
});

// =====================
// Fermer le modal
// =====================
function closeEditModal() {
	editModal.classList.add("hidden");
	editModal.classList.remove("flex");
	editForm.reset();
}

cancelEditBtn.addEventListener("click", closeEditModal);

// Fermer en cliquant en dehors
editModal.addEventListener("click", (e) => {
	if (e.target === editModal) closeEditModal();
});

// =====================
// Gestion des filtres
// =====================
filterBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
		currentFilter = btn.dataset.filter;

		// Mettre à jour l'apparence des boutons
		filterBtns.forEach((b) => {
			b.classList.remove("bg-blue-600");
			b.classList.add("bg-gray-700", "hover:bg-gray-600");
		});

		btn.classList.remove("bg-gray-700", "hover:bg-gray-600");
		btn.classList.add("bg-blue-600");

		renderNotes();
	});
});

// =====================
// Utilitaires
// =====================
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function formatDate(isoString) {
	if (!isoString) return "N/A";
	const date = new Date(isoString);
	return date.toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// =====================
// Initialisation
// =====================
fetchNotes();

// Initialiser le toggle des interrogations
initInterrogationsToggle("toggle-interrogations");
