/**
 * Gestion d'erreurs élégante avec modales et retry
 */

import { showToast } from "./toast.js";

/**
 * Affiche une modal d'erreur élégante
 * @param {Error} error - L'erreur à afficher
 * @param {Object} options - Options { title, showDetails, onRetry, retryText }
 * @returns {HTMLElement} - L'élément modal créé
 */
export function showErrorModal(error, options = {}) {
	const {
		title = "Une erreur est survenue",
		showDetails = true,
		onRetry = null,
		retryText = "Réessayer",
	} = options;

	const errorModal = document.createElement("div");
	errorModal.className =
		"error-modal fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-300";

	// Déterminer le type d'erreur et le message approprié
	let errorIcon = `
		<svg class="w-12 h-12 text-red-400" fill="currentColor" viewBox="0 0 20 20">
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
		</svg>
	`;

	let helpText = "";
	const errorMsg = error.message.toLowerCase();

	if (errorMsg.includes("timeout")) {
		errorIcon = `
			<svg class="w-12 h-12 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
			</svg>
		`;
		helpText = `
			<div class="mt-3 p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
				<p class="text-sm text-amber-200 font-medium mb-2">💡 Suggestions :</p>
				<ul class="text-xs text-amber-300 space-y-1 list-disc list-inside">
					<li>Vérifiez qu'Ollama est démarré : <code class="bg-gray-900 px-1 rounded">ollama serve</code></li>
					<li>Le modèle peut être lent, attendez quelques secondes de plus</li>
					<li>Réessayez dans un instant</li>
				</ul>
			</div>
		`;
	} else if (errorMsg.includes("model") || errorMsg.includes("modèle")) {
		errorIcon = `
			<svg class="w-12 h-12 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
				<path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
			</svg>
		`;
		helpText = `
			<div class="mt-3 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
				<p class="text-sm text-purple-200 font-medium mb-2">💡 Suggestions :</p>
				<ul class="text-xs text-purple-300 space-y-1 list-disc list-inside">
					<li>Installez le modèle : <code class="bg-gray-900 px-1 rounded">ollama pull gpt-oss</code></li>
					<li>Vérifiez les modèles disponibles : <code class="bg-gray-900 px-1 rounded">ollama list</code></li>
				</ul>
			</div>
		`;
	} else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
		errorIcon = `
			<svg class="w-12 h-12 text-red-400" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
			</svg>
		`;
		helpText = `
			<div class="mt-3 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
				<p class="text-sm text-red-200 font-medium mb-2">💡 Suggestions :</p>
				<ul class="text-xs text-red-300 space-y-1 list-disc list-inside">
					<li>Vérifiez que le serveur backend est démarré</li>
					<li>L'URL de l'API est-elle correcte ?</li>
					<li>Vérifiez votre connexion réseau</li>
				</ul>
			</div>
		`;
	}

	errorModal.innerHTML = `
		<div class="error-card bg-linear-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 transform scale-95 opacity-0 transition-all duration-300 border border-gray-700">
			<div class="flex flex-col items-center text-center mb-4">
				${errorIcon}
				<h3 class="text-xl font-bold text-white mt-4 mb-2">${title}</h3>
				<p class="text-gray-300 mb-2">${error.message}</p>
				${helpText}
			</div>
			
			${
				showDetails
					? `
				<details class="mt-4 text-xs text-gray-400">
					<summary class="cursor-pointer hover:text-gray-300 transition-colors">Détails techniques</summary>
					<pre class="mt-2 p-3 bg-gray-950 rounded-lg overflow-x-auto text-gray-500">${
						error.stack || "Aucune stack trace disponible"
					}</pre>
				</details>
			`
					: ""
			}
			
			<div class="flex gap-2 mt-6">
				${
					onRetry
						? `
					<button class="retry-btn flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 transform hover:scale-105">
						${retryText}
					</button>
				`
						: ""
				}
				<button class="close-btn flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200">
					Fermer
				</button>
			</div>
		</div>
	`;

	document.body.appendChild(errorModal);

	// Animation d'entrée
	requestAnimationFrame(() => {
		errorModal.classList.remove("opacity-0");
		const card = errorModal.querySelector(".error-card");
		if (card) {
			card.classList.remove("scale-95", "opacity-0");
			card.classList.add("scale-100");
		}
	});

	// Handlers
	const closeModal = () => {
		const card = errorModal.querySelector(".error-card");
		if (card) {
			card.classList.remove("scale-100");
			card.classList.add("scale-95", "opacity-0");
		}
		errorModal.classList.add("opacity-0");
		setTimeout(() => {
			if (errorModal.parentNode) {
				errorModal.parentNode.removeChild(errorModal);
			}
		}, 300);
	};

	const closeBtn = errorModal.querySelector(".close-btn");
	closeBtn.addEventListener("click", closeModal);

	if (onRetry) {
		const retryBtn = errorModal.querySelector(".retry-btn");
		retryBtn.addEventListener("click", async () => {
			retryBtn.disabled = true;
			retryBtn.innerHTML = `
				<svg class="w-5 h-5 animate-spin inline-block" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="ml-2">Tentative...</span>
			`;

			try {
				await onRetry();
				closeModal();
				showToast("✅ Opération réussie", "success");
			} catch (retryError) {
				retryBtn.disabled = false;
				retryBtn.textContent = retryText;
				showToast("❌ Échec de la tentative", "error");
			}
		});
	}

	// Fermer en cliquant sur l'overlay
	errorModal.addEventListener("click", (e) => {
		if (e.target === errorModal) {
			closeModal();
		}
	});

	return errorModal;
}

/**
 * Fonction wrapper pour exécuter avec gestion d'erreur automatique
 * @param {Function} fn - Fonction async à exécuter
 * @param {Object} errorOptions - Options pour showErrorModal
 * @returns {Promise<any>} - Résultat de la fonction ou undefined si erreur
 */
export async function withErrorHandling(fn, errorOptions = {}) {
	try {
		return await fn();
	} catch (error) {
		console.error("Error caught:", error);
		showErrorModal(error, errorOptions);
		return undefined;
	}
}

/**
 * Retry avec backoff exponentiel
 * @param {Function} fn - Fonction async à retry
 * @param {number} maxRetries - Nombre max de tentatives
 * @param {number} initialDelay - Délai initial en ms
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(
	fn,
	maxRetries = 3,
	initialDelay = 1000
) {
	let lastError;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (i < maxRetries - 1) {
				const delay = initialDelay * Math.pow(2, i);
				console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError;
}
