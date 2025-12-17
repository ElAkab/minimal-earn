import { getIntensityLabel, getColorClass } from "../utils/constants.js";

/**
 * Affiche une carte de note en mode agrandi (modal)
 * @param {Object} note - Les données de la note
 */
export function showExpandedCard(note) {
	const intensityLabel = getIntensityLabel(note.intensity);
	const colorClass = getColorClass(note.color);

	console.log("Affichage de la carte agrandie pour la note :", note.title);

	// Créer le conteneur modal
	const modal = document.createElement("div");
	modal.id = "expanded-card-modal";
	modal.className =
		"fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn";

	modal.innerHTML = `
        <div class="bg-neutral-900 max-w-2xl w-full rounded-2xl border-2 border-neutral-700 shadow-2xl transform transition-all duration-300 scale-100 animate-scaleIn">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-neutral-800">
                <div id="intensity-label" class="flex items-center gap-3">
                    <!-- Étiquette d'intensité -->
                    <span class="px-3 py-1 rounded-lg text-sm font-semibold ${colorClass} bg-${
		note.color
	}-500/20 border border-${note.color}-500/30">
                        ${intensityLabel}
                    </span>
                </div>
                
                <!-- Titre de la note -->
                <h2 class="text-2xl font-bold text-neutral-100">
                    ${note.title}
                </h2>

                <!-- Bouton de fermeture -->
                <button 
                    id="close-expanded-card" 
                    class="text-neutral-400 hover:text-neutral-100 cursor-pointer transition"
                    aria-label="Fermer"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Contenu principal -->
            <div class="p-6">
                <div id="expanded-card-content" class="prose prose-invert max-w-none">
                    <p class="text-neutral-300 leading-relaxed text-base">
                        ${note.content}
                    </p>
                </div>

                <!-- Métadonnées -->
                <div class="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-sm text-neutral-500">
                    <span>Créée le ${new Date(
											note.created_at
										).toLocaleDateString("fr-FR")}</span>
                    <span>Prochaine révision : ${formatNextReview(
											note.nextReviewDate
										)}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="p-6 border-t border-neutral-800 flex gap-3 justify-end">
                <button 
                    id="start-review-btn"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition"
                >
                    🎯 Commencer la révision
                </button>
                <button 
                    id="edit-note-btn"
                    class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-medium rounded-lg cursor-pointer transition"
                >
                    ✏️ Modifier
                </button>
            </div>
        </div>
    `;

	// Ajouter au DOM
	document.body.appendChild(modal);

	// Événements
	attachExpandedCardEvents(modal, note);

	// Empêcher le scroll du body
	document.body.style.overflow = "hidden";
}

/**
 * Attache les événements de la carte agrandie
 */
function attachExpandedCardEvents(modal, note) {
	// Fermer en cliquant sur le fond
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			closeExpandedCard();
		}
	});

	// Fermer avec le bouton X
	const closeBtn = modal.querySelector("#close-expanded-card");
	closeBtn.addEventListener("click", closeExpandedCard);

	// Fermer avec la touche Échap
	const handleEscape = (e) => {
		if (e.key === "Escape") {
			closeExpandedCard();
			document.removeEventListener("keydown", handleEscape);
		}
	};
	document.addEventListener("keydown", handleEscape);

	// Bouton "Commencer la révision"
	const reviewBtn = modal.querySelector("#start-review-btn");
	reviewBtn.addEventListener("click", () => {
		closeExpandedCard();
		// Émettre un événement pour lancer la révision
		const event = new CustomEvent("startReview", { detail: note });
		window.dispatchEvent(event);
	});

	// Bouton "Modifier"
	const editBtn = modal.querySelector("#edit-note-btn");
	editBtn.addEventListener("click", () => {
		console.log("Modification de la note:", note.id);
		// TODO: Implémenter la fonctionnalité de modification
		const event = new CustomEvent("editNote", { detail: note });
		window.dispatchEvent(event);
	});
}

/**
 * Ferme la carte agrandie
 */
function closeExpandedCard() {
	const modal = document.getElementById("expanded-card-modal");
	if (modal) {
		// Animation de sortie
		modal.classList.add("animate-fadeOut");
		setTimeout(() => {
			modal.remove();
			document.body.style.overflow = "auto";
		}, 200);
	}
}

/**
 * Formate la date de prochaine révision
 */
function formatNextReview(dateString) {
	const date = new Date(dateString);
	const now = new Date();

	if (date < now) {
		return "En retard ⚠️";
	}

	const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return "Demain";
	if (diffDays < 7) return `Dans ${diffDays} jours`;

	return date.toLocaleDateString("fr-FR");
}
