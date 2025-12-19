/**
 * Constantes partagées dans toute l'application
 */

// =====================
// Mapping intensité → nombre (pour l'envoi au backend)
// =====================
export const INTENSITY_MAP = {
	Chill: 1,
	Sérieux: 2,
	Nécessaire: 3,
};

// =====================
// Mapping nombre → texte (pour l'affichage)
// =====================
export const INTENSITY_TEXT_MAP = {
	1: "Chill",
	2: "Sérieux",
	3: "Nécessaire",
};

// =====================
// Mapping couleurs → classes Tailwind
// =====================
export const COLOR_CLASSES = {
	blue: "text-blue-500",
	amber: "text-amber-500",
	red: "text-red-500",
};

// =====================
// Mapping intensité → couleur par défaut
// =====================
export const INTENSITY_COLOR_MAP = {
	1: "blue",
	2: "amber",
	3: "red",
};

/**
 * Convertit un numéro d'intensité en libellé texte
 * @param {number} intensity - Le numéro d'intensité (1, 2, 3)
 * @returns {string} Le libellé textuel ("Chill", "Sérieux", "Nécessaire")
 */
export function getIntensityLabel(intensity) {
	return INTENSITY_TEXT_MAP[intensity] || "Inconnu";
}

/**
 * Convertit un libellé texte en numéro d'intensité
 * @param {string} label - Le libellé textuel ("Chill", "Sérieux", "Nécessaire")
 * @returns {number} Le numéro d'intensité (1, 2, 3)
 */
export function getIntensityValue(label) {
	return INTENSITY_MAP[label]; // Par défaut : Sérieux
}

/**
 * Obtient la classe Tailwind pour une couleur
 * @param {string} color - La couleur (blue, amber, red)
 * @returns {string} La classe Tailwind complète
 */
export function getColorClass(color) {
	return COLOR_CLASSES[color] || COLOR_CLASSES.amber;
}

/**
 * Obtient la couleur par défaut pour une intensité
 * @param {number} intensity - Le numéro d'intensité (1, 2, 3)
 * @returns {string} La couleur (blue, amber, red)
 */
export function getIntensityColor(intensity) {
	return INTENSITY_COLOR_MAP[intensity] || "amber";
}
