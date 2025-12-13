// Système de notifications toast
const toastContainer = document.createElement("div");
toastContainer.id = "toast-container";
toastContainer.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
document.body.appendChild(toastContainer);

/**
 * Affiche une notification toast
 * @param {string} message - Le message à afficher
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Durée en ms (0 = permanent jusqu'à fermeture manuelle)
 */
export function showToast(message, type = "info") {
	const toast = document.createElement("div");
	toast.className = `flex items-center w-full max-w-xs p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full opacity-0`;

	// Couleurs selon le type
	const typeClasses = {
		success: "bg-green-600",
		error: "bg-red-600",
		info: "bg-blue-600",
		warning: "bg-amber-600",
	};

	toast.classList.add(typeClasses[type] || typeClasses.info);

	// Icônes selon le type
	const icons = {
		success: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
		error: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
		info: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
		warning: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
	};

	toast.innerHTML = `
		<div class="inline-flex items-center justify-center shrink-0 w-8 h-8">
			${icons[type] || icons.info}
		</div>
		<div class="ml-3 text-sm font-normal flex-1">${message}</div>
		<button type="button" class="toast-close ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-white/20 inline-flex h-8 w-8 items-center justify-center">
			<span class="sr-only">Fermer</span>
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
			</svg>
		</button>
	`;

	toastContainer.appendChild(toast);

	// Animation d'entrée
	requestAnimationFrame(() => {
		toast.classList.remove("translate-x-full", "opacity-0");
	});

	// Bouton de fermeture
	const closeBtn = toast.querySelector(".toast-close");
	closeBtn.addEventListener("click", () => removeToast(toast));

	return toast;
}

function removeToast(toast) {
	toast.classList.add("translate-x-full", "opacity-0");
	setTimeout(() => {
		if (toast.parentNode) toast.parentNode.removeChild(toast);
	}, 300);
}
