import { getIntensityLabel, getColorClass } from "../utils/constants.js";

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

	// Créer l'élément conteneur
	const noteElement = document.createElement("div");

	// Générer le HTML de la carte
	noteElement.innerHTML = `
        <div class="bg-neutral-900/90 max-w-sm p-6 rounded-xl border border-neutral-800 shadow-lg transition hover:shadow-xl">
            <div class="flex items-center justify-between mb-4">
                <span class="px-2.5 py-0.5 rounded text-xs font-medium ${colorClass} bg-${note.color}-500/10 border border-${note.color}-500/20">
                    ${intensityLabel}
                </span>
                <h5 class="mb-2 text-xl font-semibold tracking-tight text-neutral-100">
                    ${note.title}
                </h5>
            </div>

            <p class="mb-5 text-sm leading-relaxed text-neutral-400">
                ${note.content}
            </p>

            <div class="flex items-center justify-between">
                <input 
                    id="note-checkbox-${note.id}" 
                    type="checkbox" 
                    class="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft cursor-pointer"
                    data-note-id="${note.id}"
                >

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
