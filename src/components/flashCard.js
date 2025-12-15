/**
 * Génère le HTML d'une carte mémo
 * @param {Object} note - Les données de la note
 * @returns {string} Le HTML de la carte
 */
function generateCardHTML(note) {
	const { title, content, intensity, color } = note;

	// Remplissage du payload pour le suivi
	payload = {
		id: note.id || crypto.randomUUID(),
		title: title,
		content: content,
		date: note.date || Date.now(),
	};

	// =====================
	// Mapping des couleurs vers les classes Tailwind complètes
	// =====================
	const colorClasses = {
		blue: "text-blue-500",
		amber: "text-amber-500",
		red: "text-red-500",
	};

	// Récupérer la classe complète ou utiliser une couleur par défaut
	const bgColorClass = colorClasses[color];
	console.log("Couleur de fond pour la carte :", bgColorClass);

	return `
        <article
            class="bg-black border-4 w-full max-h-[632px] p-4 rounded-3xl flex flex-col justify-center items-center relative z-50"
            id="toast-success"
            role="alert"
        >
            <div class="w-full flex justify-between items-center p-2 rounded-base">
                <span class="${bgColorClass} text-sm font-bold p-2.5 rounded-base">
                    ${intensity}
                </span>
                <h3 class="mx-auto text-2xl font-extrabold">${title}</h3>
                <button
                    id="close-button"
                    type="button"
                    class="flex items-center justify-center text-body hover:text-heading bg-transparent box-border border border-transparent hover:bg-neutral-secondary-medium focus:ring-4 focus:ring-neutral-tertiary font-medium leading-5 rounded-full text-sm h-8 w-8 focus:outline-none cursor-pointer transition"
                    data-dismiss-target="#toast-success"
                    aria-label="Close"
                >
                    <span class="sr-only">Close</span>
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
                    </svg>
                </button>
            </div>

            <hr class="my-3" />

            <p id="content" class="text-center overflow-y-auto">${content}</p>

            <!-- Zone de messages utilisateur -->

            <div id="messages-container" class="w-full max-h-48 overflow-y-auto my-4 space-y-2">
                <!-- Les messages apparaîtront ici -->
            </div>

            <!-- Zone de messages utilisateur -->

            <div class="w-full flex items-center px-3 py-2 rounded-base bg-black mt-7">
                <textarea
                    id="chat"
                    rows="1"
                    class="bg-neutral-primary-medium border border-default-medium text-heading text-sm rounded-full focus:ring-fg-disabled focus:border-fg-disabled block w-full px-3 py-2.5 placeholder:text-body resize-none"
                    placeholder="Your message..."
                ></textarea>
            </div>

            <!-- Actions -->
				<div class="w-full p-6 flex items-center justify-between">
					<div id="actions-container" class="flex items-center">
						<div class="flex flex-col ml-auto">
							<button
                                id="hint-button"
								type="button"
								class="show-hint px-4 py-2
								bg-linear-to-b from-amber-500 to-orange-600
								hover:from-amber-400 hover:to-orange-500
								text-white rounded-t-full rounded-l-full font-medium cursor-pointer
								transition-colors duration-300 ease-in-out">
								💡
							</button>

							<button
                                id="dont-know-button"
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
						
                    <button
                        type="submit"
                        class="inline-flex flex-row-reverse p-2.5 px-4 bg-gray-800 justify-center text-shadow-fg-disabled rounded-full cursor-pointer hover:bg-fg-disabled/35 gap-3"
                    >
                        <svg class="w-6 h-6 rotate-90 rtl:-rotate-90" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 18-7 3 7-18 7 18-7-3Zm0 0v-5"/>
                        </svg>
                        <span class="text-base">Soumettre</span>
                    </button>
				</div>
        </article>
    `;
}

/**
 * Ajoute un message utilisateur dans le conteneur de messages
 * @param {HTMLElement} container - Le conteneur de messages
 * @param {string} message - Le message à afficher
 */
function addUserMessage(container, message) {
	// Ajouter le séparateur seulement si c'est le premier message
	if (container.children.length === 0) {
		container.insertAdjacentHTML("beforeend", `<hr class="my-2" />`);
	}

	// Ajouter le message utilisateur
	container.innerHTML = `
		<div class="bg-white/15 flex rounded-lg opacity-100 transition justify-center">
			<p class="text-white p-3 rounded-lg max-w-xs wrap-break-words">
				${message}
			</p>
		</div>
		`;

	// Scroll automatique vers le bas
	container.scrollTop = container.scrollHeight;
}

/**
 * Remplace la description par la réponse de l'IA
 * @param {HTMLElement} descriptionElement - L'élément contenant la description
 * @param {string} iaMessage - Le message de l'IA
 */
function updateDescription(descriptionElement, iaMessage) {
	descriptionElement.innerHTML = iaMessage;
}

/**
 * Simule une réponse de l'IA (à remplacer par un appel réel via backend/lib/ai.js)
 * @param {string} userMessage - Le message de l'utilisateur
 * @param {HTMLElement} descriptionElement - L'élément de description à mettre à jour
 */

// Cache pour la note en cours (aidera à garder un suivi)
let payload = {
	AImessages: [],
	userMessages: [],
};

function mockIAResponse(userMessage, descriptionElement) {
	// Afficher un indicateur de chargement
	updateDescription(
		descriptionElement,
		'<span class="animate-pulse">L\'IA réfléchit...</span>'
	);

	setTimeout(() => {
		const iaMessage = `Réponse IA à : "${userMessage}"`;
		console.log("Réponse IA générée pour :", iaMessage);
		updateDescription(descriptionElement, iaMessage);
	}, 1000); // Simuler un délai de 1 seconde
}

/**
 * Affiche une carte mémo en modal
 * Gère la création, l'affichage et la fermeture
 * @param {Object} note - Les données de la note
 * @returns {Object} Objet avec méthode close() pour fermer programmatiquement
 */
export function flashCard(note) {
	// 1. Générer le HTML
	const cardHTML = generateCardHTML(note);
	console.log("HTML de la carte généré :", cardHTML);

	// 2. Créer l'overlay
	const overlay = document.createElement("div");
	overlay.className =
		"fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4";
	overlay.id = "flash-card-overlay";

	// 3. Créer le conteneur de la carte
	const cardWrapper = document.createElement("div");
	cardWrapper.className = "max-w-2xl w-full";
	cardWrapper.innerHTML = cardHTML;

	// 4. Assembler
	overlay.appendChild(cardWrapper);
	document.body.appendChild(overlay);

	// 5. Gestion de la fermeture (+ reset du cache payload)
	function closeCard() {
		payload = {};
		overlay.remove();
	}

	// 6. Récupération des éléments DOM
	const closeBtn = overlay.querySelector("#close-button");
	const dontKnowBtn = overlay.querySelector("#dont-know-button");
	const hintBtn = overlay.querySelector("#hint-button");
	const chatTextarea = overlay.querySelector("#chat");
	const sendBtn = overlay.querySelector("button[type='submit']");
	const messagesContainer = overlay.querySelector("#messages-container");
	const descriptionElement = overlay.querySelector("#content");
	const actionsContainer = overlay.querySelector("#actions-container");

	// 7. Gestion du bouton de fermeture
	if (closeBtn) {
		closeBtn.addEventListener("click", closeCard);
	}

	// 8. Gestion du bouton "Je sais pas"
	if (dontKnowBtn) {
		dontKnowBtn.addEventListener("click", () => {
			// TODO: Intégrer avec backend/lib/ai.js pour afficher la réponse
			updateDescription(
				descriptionElement,
				"Réponse attendue : [À récupérer depuis l'IA]"
			);
			console.log("Bouton 'Je sais pas' cliqué");
		});
	}

	// 9. Gestion du bouton "Indice"
	if (hintBtn) {
		hintBtn.addEventListener("click", () => {
			// TODO: Intégrer avec backend/lib/ai.js pour générer un indice
			updateDescription(descriptionElement, "Indice : [À générer par l'IA]");
			console.log("Bouton 'Indice' cliqué");
		});
	}

	// 10. Gestion du bouton tricher

	// 11. Gestion de l'envoi du message
	if (chatTextarea && sendBtn && messagesContainer && descriptionElement) {
		const handleSendMessage = () => {
			!actionsContainer.classList.contains("hidden")
				? actionsContainer.classList.add("hidden")
				: null; // Cacher les actions après le premier message

			const message = chatTextarea.value.trim();
			if (message) {
				console.log("Message envoyé :", message);

				// Ajouter le message utilisateur à l'historique
				addUserMessage(messagesContainer, message);

				// Effacer le champ de texte
				chatTextarea.value = "";

				// Appeler la fonction mock de réponse IA
				// TODO: Remplacer par un vrai appel à backend/lib/ai.js
				mockIAResponse(message, descriptionElement);
			}
		};

		// Event listener pour le bouton
		sendBtn.addEventListener("click", handleSendMessage);

		// Event listener pour Enter (sans Shift)
		chatTextarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		});
	}

	// Retourner une API pour contrôle externe si besoin
	return { close: closeCard };
}
