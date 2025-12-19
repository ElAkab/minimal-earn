/**
 * ========================================
 * POPUP.JS - Logique de l'interface popup
 * ========================================
 *
 * Rôle : Contrôler l'extension depuis l'icône
 * - Activer/Désactiver les flashCards automatiques
 * - Forcer l'affichage immédiat d'une carte
 * - Afficher l'état actuel (activé/désactivé)
 */

// ==============================================
// ÉLÉMENTS DOM
// ==============================================
const toggleBtn = document.getElementById("toggle");
const showNowBtn = document.getElementById("showNow");
const statusDiv = document.getElementById("status");

// ==============================================
// RÉCUPÉRATION DE L'ÉTAT AU CHARGEMENT
// ==============================================
chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
	updateUI(response.isActive);
});

// ==============================================
// BOUTON TOGGLE (Activer/Désactiver)
// ==============================================
toggleBtn.addEventListener("click", () => {
	console.log("🔘 [Popup] Toggle cliqué");

	chrome.runtime.sendMessage({ type: "TOGGLE_ACTIVE" }, (response) => {
		console.log("📬 [Popup] Réponse reçue :", response);
		updateUI(response.isActive);
	});
});

// ==============================================
// BOUTON AFFICHER MAINTENANT
// ==============================================
showNowBtn.addEventListener("click", () => {
	console.log("🎯 [Popup] Affichage immédiat demandé");

	chrome.runtime.sendMessage({ type: "SHOW_NOW" }, (response) => {
		console.log("✅ [Popup] FlashCard envoyée");
		// Fermer le popup après 500ms
		setTimeout(() => window.close(), 500);
	});
});

// ==============================================
// MISE À JOUR DE L'INTERFACE
// ==============================================
function updateUI(isActive) {
	if (isActive) {
		// État : Activé
		statusDiv.textContent = "✅ Activé (toutes les 15s)";
		statusDiv.className = "status active";
		toggleBtn.textContent = "Désactiver les FlashCards";
		toggleBtn.classList.add("active");
		console.log("🟢 [Popup] Interface mise à jour : ACTIVÉ");
	} else {
		// État : Désactivé
		statusDiv.textContent = "⏸️ Désactivé";
		statusDiv.className = "status inactive";
		toggleBtn.textContent = "Activer les FlashCards";
		toggleBtn.classList.remove("active");
		console.log("🔴 [Popup] Interface mise à jour : DÉSACTIVÉ");
	}
}
