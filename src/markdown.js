// =====================
// Utilitaire de rendu Markdown sécurisé
// =====================
// Utilise marked.js pour convertir Markdown → HTML
// et DOMPurify pour sécuriser le HTML (protection XSS)

import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Configure marked avec des options optimisées
 */
marked.setOptions({
	breaks: true, // Convertit les retours à la ligne en <br>
	gfm: true, // GitHub Flavored Markdown (tableaux, listes de tâches, etc.)
	headerIds: false, // Pas d'IDs sur les titres (plus léger)
	mangle: false, // Ne pas encoder les emails
});

/**
 * Convertit du Markdown en HTML sécurisé
 * @param {string} markdown - Texte Markdown à convertir
 * @returns {string} - HTML sécurisé
 */
export function renderMarkdown(markdown) {
	if (!markdown) return "";

	try {
		// Étape 1 : Convertir Markdown → HTML brut
		const rawHtml = marked.parse(markdown);

		// Étape 2 : Sécuriser avec DOMPurify (enlève les scripts malicieux)
		const safeHtml = DOMPurify.sanitize(rawHtml, {
			// Options de sécurité
			ALLOWED_TAGS: [
				"p",
				"br",
				"strong",
				"em",
				"u",
				"s",
				"code",
				"pre",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"ul",
				"ol",
				"li",
				"blockquote",
				"a",
				"img",
				"table",
				"thead",
				"tbody",
				"tr",
				"th",
				"td",
			],
			ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
			// Assainir les liens
			ALLOW_DATA_ATTR: false,
			ALLOW_UNKNOWN_PROTOCOLS: false,
		});

		return safeHtml;
	} catch (error) {
		console.error("❌ Erreur rendu Markdown:", error);
		// Fallback : retourner le texte brut échappé
		return escapeHtml(markdown);
	}
}

/**
 * Échappe les caractères HTML (fallback de sécurité)
 * @param {string} text - Texte à échapper
 * @returns {string} - Texte échappé
 */
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Ajoute des styles Tailwind aux éléments Markdown générés
 * Optionnel : applique après avoir injecté le HTML dans le DOM
 * @param {HTMLElement} container - Conteneur avec le HTML Markdown
 */
export function stylizeMarkdown(container) {
	if (!container) return;

	// Titres
	container
		.querySelectorAll("h1")
		.forEach((el) => el.classList.add("text-2xl", "font-bold", "mb-2", "mt-4"));
	container
		.querySelectorAll("h2")
		.forEach((el) => el.classList.add("text-xl", "font-bold", "mb-2", "mt-3"));
	container
		.querySelectorAll("h3")
		.forEach((el) => el.classList.add("text-lg", "font-bold", "mb-1", "mt-2"));

	// Paragraphes
	container.querySelectorAll("p").forEach((el) => el.classList.add("mb-2"));

	// Code inline
	container.querySelectorAll("code:not(pre code)").forEach((el) => {
		el.classList.add(
			"bg-gray-700",
			"px-1.5",
			"py-0.5",
			"rounded",
			"text-sm",
			"text-orange-400"
		);
	});

	// Blocs de code
	container.querySelectorAll("pre").forEach((el) => {
		el.classList.add(
			"bg-gray-900",
			"p-3",
			"rounded",
			"overflow-x-auto",
			"mb-3",
			"border",
			"border-gray-700"
		);
	});
	container.querySelectorAll("pre code").forEach((el) => {
		el.classList.add("text-sm", "text-gray-200");
	});

	// Listes
	container
		.querySelectorAll("ul")
		.forEach((el) =>
			el.classList.add("list-disc", "list-inside", "mb-2", "ml-4")
		);
	container
		.querySelectorAll("ol")
		.forEach((el) =>
			el.classList.add("list-decimal", "list-inside", "mb-2", "ml-4")
		);
	container.querySelectorAll("li").forEach((el) => el.classList.add("mb-1"));

	// Citations
	container.querySelectorAll("blockquote").forEach((el) => {
		el.classList.add(
			"border-l-4",
			"border-blue-500",
			"pl-4",
			"italic",
			"text-gray-400",
			"my-2"
		);
	});

	// Liens
	container.querySelectorAll("a").forEach((el) => {
		el.classList.add("text-blue-400", "hover:text-blue-300", "underline");
		// Ouvrir les liens dans un nouvel onglet par sécurité
		if (el.hostname !== window.location.hostname) {
			el.target = "_blank";
			el.rel = "noopener noreferrer";
		}
	});

	// Emphase
	container
		.querySelectorAll("strong")
		.forEach((el) => el.classList.add("font-bold", "text-white"));
	container.querySelectorAll("em").forEach((el) => el.classList.add("italic"));
}
