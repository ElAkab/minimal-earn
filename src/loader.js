/**
 * Composant de chargement réutilisable
 * Affiche un overlay avec spinner et message
 */

/**
 * Affiche un overlay de chargement
 * @param {string} message - Message à afficher
 * @returns {HTMLElement} - L'élément overlay créé
 */
export function showLoadingOverlay(message = "Chargement...") {
	const overlay = document.createElement("div");
	overlay.className =
		"loading-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center opacity-0 transition-opacity duration-300";
	overlay.innerHTML = `
		<div class="loading-card bg-linear-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-8 max-w-sm transform scale-95 transition-all duration-300 border border-gray-700/50">
			<div class="flex flex-col items-center gap-4">
				<svg class="w-16 h-16 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<div class="text-center">
					<p class="text-white font-medium text-lg">${message}</p>
					<p class="text-gray-400 text-sm mt-2">Veuillez patienter...</p>
				</div>
			</div>
		</div>
	`;

	document.body.appendChild(overlay);

	// Animation d'entrée
	requestAnimationFrame(() => {
		overlay.classList.remove("opacity-0");
		const card = overlay.querySelector(".loading-card");
		if (card) {
			card.classList.remove("scale-95");
			card.classList.add("scale-100");
		}
	});

	return overlay;
}

/**
 * Ferme un overlay de chargement
 * @param {HTMLElement} overlay - L'overlay à fermer
 */
export function hideLoadingOverlay(overlay) {
	if (!overlay || !overlay.parentNode) return;

	overlay.classList.add("opacity-0");
	const card = overlay.querySelector(".loading-card");
	if (card) {
		card.classList.remove("scale-100");
		card.classList.add("scale-95");
	}

	setTimeout(() => {
		if (overlay.parentNode) {
			overlay.parentNode.removeChild(overlay);
		}
	}, 300);
}

/**
 * Affiche un mini-loader inline
 * @param {string} size - Taille du loader ('sm', 'md', 'lg')
 * @returns {string} - HTML du loader
 */
export function inlineLoader(size = "md") {
	const sizes = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	const sizeClass = sizes[size] || sizes.md;

	return `
		<svg class="${sizeClass} animate-spin" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	`;
}

/**
 * Skeleton loader pour les cartes
 * @returns {string} - HTML du skeleton
 */
export function skeletonCard() {
	return `
		<div class="animate-pulse space-y-4 p-6 bg-gray-800 rounded-xl border border-gray-700">
			<div class="flex items-center gap-2">
				<div class="h-6 w-20 bg-gray-700 rounded-full"></div>
				<div class="h-6 w-32 bg-gray-700 rounded-full"></div>
			</div>
			<div class="h-8 w-3/4 bg-gray-700 rounded"></div>
			<div class="space-y-2">
				<div class="h-4 w-full bg-gray-700 rounded"></div>
				<div class="h-4 w-5/6 bg-gray-700 rounded"></div>
				<div class="h-4 w-4/6 bg-gray-700 rounded"></div>
			</div>
			<div class="flex justify-between pt-4">
				<div class="h-10 w-24 bg-gray-700 rounded-lg"></div>
				<div class="h-10 w-32 bg-gray-700 rounded-lg"></div>
			</div>
		</div>
	`;
}
