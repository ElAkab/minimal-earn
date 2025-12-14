// Système de notifications toast
const toastContainer = document.createElement("div");
toastContainer.id = "toast-container";
toastContainer.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
document.body.appendChild(toastContainer);

/**
 * Affiche une notification toast
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de toast : 'info', 'success', 'error', 'warning'
 * @param {number} duration - Durée d'affichage en ms (par défaut 3000)
 * @returns {HTMLElement} - L'élément toast créé
 */
export function showToast(message, type = "info", duration = 3000) {
	const toast = document.createElement("div");

	// Couleurs selon le type
	const colors = {
		info: "bg-blue-600",
		success: "bg-green-600",
		error: "bg-red-600",
		warning: "bg-amber-600",
	};

	const bgColor = colors[type] || colors.info;

	toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-y-2 opacity-0`;
	toast.textContent = message;

	document.body.appendChild(toast);

	// Animation d'entrée
	setTimeout(() => {
		toast.classList.remove("translate-y-2", "opacity-0");
	}, 10);

	// Retrait automatique
	setTimeout(() => {
		toast.classList.add("translate-y-2", "opacity-0");
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 300);
	}, duration);

	// Retourner l'élément pour permettre de le fermer manuellement
	return toast;
}

/**
 * Génère le contenu HTML formaté pour une interrogation
 * @param {Object} note - La note source
 * @param {string} question - La question générée
 * @param {string} model - Le modèle IA utilisé
 * @returns {string} HTML formaté
 */
export function createInterrogationContent(note, question, model) {
	// Couleurs des badges d'intensité
	const intensityColors = {
		chill: "bg-blue-500",
		moderate: "bg-amber-500",
		intensive: "bg-red-500",
	};

	// Couleurs des tags IA
	const aiTagColors = {
		"hir0rameel/qwen-claude": "bg-orange-500",
		"gpt-oss": "bg-cyan-500",
	};

	// Badge intensité
	const intensityBadge = `<span class="inline-block ${
		intensityColors[note.intensity] || "bg-gray-500"
	} text-xs px-2 py-1 rounded-full text-white font-semibold">${
		note.intensity || "moderate"
	}</span>`;

	// Tags IA
	const aiTags =
		note.aiTags && note.aiTags.length > 0
			? note.aiTags
					.map(
						(tag) =>
							`<span class="inline-block ${
								aiTagColors[tag] || "bg-gray-700"
							} text-xs px-2 py-1 rounded text-white font-bold">${tag}</span>`
					)
					.join(" ")
			: "";

	// Titre (si présent)
	const titleSection = note.title
		? `<p class="text-sm font-semibold text-gray-200 mb-1">${escapeHtml(
				note.title
		  )}</p>`
		: "";

	return `
		<div class="space-y-2">
			<div class="flex items-center gap-2 flex-wrap">
				${intensityBadge}
				${aiTags}
			</div>
			${titleSection}
			<div class="flex items-start gap-2">
				<span class="text-lg shrink-0">🤖</span>
				<div class="flex-1">
					<p class="text-xs text-gray-400 mb-1">${escapeHtml(model)}</p>
					<p class="text-sm font-medium">${escapeHtml(question)}</p>
				</div>
			</div>
		</div>
	`;
}

/**
 * Échappe les caractères HTML pour éviter les injections
 * @param {string} text - Le texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}
