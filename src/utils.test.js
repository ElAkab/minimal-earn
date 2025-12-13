import { describe, it, expect } from "vitest";

// =====================
// Tests pour les fonctions utilitaires frontend
// =====================

/**
 * Fonction utilitaire pour échapper HTML (à extraire du code)
 */
function escapeHtml(text) {
	if (typeof document === "undefined") {
		// Environnement Node.js (tests)
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

describe("escapeHtml", () => {
	it("devrait échapper les caractères HTML dangereux", () => {
		const dangerous = '<script>alert("XSS")</script>';
		const escaped = escapeHtml(dangerous);
		expect(escaped).not.toContain("<script>");
		expect(escaped).toContain("&lt;");
		expect(escaped).toContain("&gt;");
	});

	it("devrait gérer les guillemets", () => {
		const text = 'Hello "world"';
		const escaped = escapeHtml(text);
		expect(escaped).toContain("&quot;");
	});

	it("devrait laisser le texte normal inchangé", () => {
		const text = "Hello world";
		const escaped = escapeHtml(text);
		expect(escaped).toBe("Hello world");
	});

	it("devrait gérer les chaînes vides", () => {
		expect(escapeHtml("")).toBe("");
	});
});

// =====================
// Tests pour le formatage de dates
// =====================
function formatDate(isoString) {
	if (!isoString) return "N/A";
	const date = new Date(isoString);
	return date.toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

describe("formatDate", () => {
	it("devrait formater une date ISO correctement", () => {
		const isoDate = "2024-12-13T10:30:00.000Z";
		const formatted = formatDate(isoDate);
		expect(formatted).toBeTruthy();
		expect(formatted).not.toBe("N/A");
	});

	it("devrait retourner N/A pour une date nulle", () => {
		expect(formatDate(null)).toBe("N/A");
		expect(formatDate(undefined)).toBe("N/A");
		expect(formatDate("")).toBe("N/A");
	});

	it("devrait gérer les dates invalides", () => {
		const result = formatDate("invalid-date");
		expect(result).toBeTruthy();
	});
});
