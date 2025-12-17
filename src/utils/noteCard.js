import { getIntensityLabel, getColorClass } from "./constants.js";

/**
 * Crée un élément DOM pour afficher une carte de note
 * @param {Object} note - Les données de la note
 * @param {number} note.id - ID de la note
 * @param {string} note.title - Titre de la note
 * @param {string} note.content - Contenu de la note
 * @param {number} note.intensity - Intensité (1, 2, 3)
 * @param {string} note.color - Couleur (blue, amber, red)
 * @param {string} note.nextReviewDate - Date de prochaine révision
 * @returns {HTMLElement} L'élément DOM de la carte
 */
export function createNoteCard(note) {
	// Conversion de l'intensité nombre → texte
	const intensityLabel = getIntensityLabel(note.intensity);
	const colorClass = getColorClass(note.color);
	// const formattedNextReviewDate = formatReviewDate(note.nextReviewDate);

	console.log(note);

	// Créer l'élément conteneur
	const noteElement = document.createElement("div");

	// Générer le HTML de la carte
	noteElement.innerHTML = `
        <div class="bg-neutral-900/90 max-w-sm h-64 p-6 rounded-xl border border-neutral-800 shadow-lg transition hover:shadow-xl">
            <div class="flex items-center justify-between mb-4">
                <span class="px-2.5 py-0.5 rounded text-xs font-medium ${colorClass} bg-${
		note.color
	}-500/10 border border-${note.color}-500/20">
                    ${intensityLabel}
                </span>

                <h5 class="text-xl text-center font-semibold tracking-tight text-neutral-100">
                    ${note.title}
                </h5>

				<button id="delete-note-${note.id}" data-note-id="${note.id}"
				title="Supprimer cette note" type="button" class="text-body bg-transparent hover:bg-neutral-tertiary/5 hover:text-heading rounded-base text-sm w-9 h-9 cursor-pointer transition" data-modal-hide="static-modal">
                    <svg class="w-5 h-5 mx-auto" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>

            <p class="mb-5 text-sm leading-relaxed text-neutral-400 overflow-hidden text-ellipsis line-clamp-4 h-24">
                ${note.content}
            </p>

            <div class="flex items-center justify-between border-t border-neutral-800 pt-4 bg-linear-to-t from-neutral-900 via-neutral-900/35 to-transparent">
                <input 
                    id="note-checkbox-${note.id}" 
                    type="checkbox" 
                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer"
                    data-note-id="${note.id}"
                >

				<span class="text-[9px] text-neutral-400">
					Intervalle : ${note.currentInterval} jour${note.currentInterval > 1 ? "s" : ""}
				</span>

                <button
                    id="read-more-${note.id}"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand hover:text-brand-strong bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-lg transition cursor-pointer"
                    data-note-id="${note.id}"
                >
                    Read more
                </button>
            </div>
        </div>
    `;

	// Ajouter les événements
	attachNoteCardEvents(noteElement, note);

	return noteElement;
}

/**
 * Attache les événements aux éléments interactifs de la carte
 * @param {HTMLElement} cardElement - L'élément DOM de la carte
 * @param {Object} note - Les données de la note
 */
function attachNoteCardEvents(cardElement, note) {
	// Event : Checkbox (marquer comme révision terminée)
	const checkbox = cardElement.querySelector(`#note-checkbox-${note.id}`);
	if (checkbox) {
		checkbox.addEventListener("change", (e) => {
			handleCheckboxChange(e, note);
		});
	}

	// Bouton "Read more"
	const readMoreButton = cardElement.querySelector(`#read-more-${note.id}`);
	if (readMoreButton) {
		readMoreButton.addEventListener("click", (e) => {
			e.preventDefault();
			handleReadMore(note);
		});
	}

	// Event : Lien "Read more" (ouvrir la carte de révision)
	const readMoreLink = cardElement.querySelector(
		`a[data-note-id="${note.id}"]`
	);
	if (readMoreLink) {
		readMoreLink.addEventListener("click", (e) => {
			e.preventDefault();
			handleReadMore(note);
		});
	}

	// Bouton "Supprimer"
	const deleteButton = cardElement.querySelector(`#delete-note-${note.id}`);
	if (deleteButton) {
		deleteButton.addEventListener("click", async (e) => {
			e.preventDefault();
			if (confirm(`Supprimer "${note.title}" ?`)) {
				try {
					const response = await fetch(
						`http://localhost:3000/api/notes/${note.id}`,
						{
							method: "DELETE",
						}
					);
					if (response.ok) {
						cardElement.remove();
						console.log(`✅ Note ${note.id} supprimée`);
					}
				} catch (error) {
					console.error("❌ Erreur suppression:", error);
				}
			}
		});
	}
}

/**
 * Gère le changement d'état de la checkbox
 * @param {Event} event - L'événement change
 * @param {Object} note - Les données de la note
 */
function handleCheckboxChange(event, note) {
	const isChecked = event.target.checked;
	console.log(
		`Note ${note.id} (${note.title}) marquée comme ${
			isChecked ? "révisée" : "non révisée"
		}`
	);

	// TODO: Appeler une API pour mettre à jour l'état de révision
	// Exemple : await fetch(`/api/notes/${note.id}/review`, { method: 'PATCH', body: { reviewed: isChecked } })
}

/**
 * Gère le clic sur "Read more"
 * @param {Object} note - Les données de la note
 */
function handleReadMore(note) {
	console.log(`Ouverture de la carte de révision pour : ${note.title}`);

	// Émettre un événement pour agrandir la carte
	const event = new CustomEvent("expandNoteCard", { detail: { note } });
	window.dispatchEvent(event);
}

/**
 * Formate une date de révision pour l'affichage
 * @param {string} dateString - Date au format ISO
 * @returns {string} Date formatée en français
 */
export function formatReviewDate(dateString) {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = date - now;
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return "Demain";
	if (diffDays === -1) return "Hier";
	if (diffDays < 0) return `Il y a ${Math.abs(diffDays)} jours`;
	if (diffDays < 7) return `Dans ${diffDays} jours`;

	return date.toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}
