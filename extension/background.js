/**
 * ==============================================
 * BACKGROUND.JS - Service Worker de l'extension
 * ==============================================
 *
 * Rôle : "Cerveau central" qui tourne en permanence
 * - Planifie les révisions avec des alarmes (toutes les 15s)
 * - Appelle l'API backend pour récupérer les notes
 * - Envoie des messages aux content-scripts pour afficher les flashCards
 * - Gère l'activation/désactivation depuis le popup
 */

// ==============================================
// CONFIGURATION
// ==============================================
const ALARM_NAME = "reviewCheck";
const INTERVAL_MINUTES = 0.25; // 15 secondes (15/60 = 0.25)
const API_URL = "http://localhost:3000/api/notes/review";
const DEFAULT_INTENSITY = 2; // Intensité "Sérieux" par défaut pour les révisions

// ==============================================
// INITIALISATION AU DÉMARRAGE
// ==============================================
chrome.runtime.onInstalled.addListener(() => {
	console.log("⚡ [Background] Extension installée");

	// Initialiser l'état : activé par défaut
	chrome.storage.local.set({ isActive: false }, () => {
		console.log("📦 [Background] État initial : désactivé");
	});
});

// ==============================================
// ÉCOUTE DES MESSAGES DU POPUP
// ==============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("📨 [Background] Message reçu :", message);

	if (message.type === "TOGGLE_ACTIVE") {
		// Basculer l'état activé/désactivé
		handleToggle(sendResponse);
		return true; // Garde la connexion ouverte pour sendResponse async
	}

	if (message.type === "SHOW_NOW") {
		// Forcer l'affichage immédiat d'une flashCard
		showFlashCardNow();
		sendResponse({ success: true });
	}

	if (message.type === "GET_STATE") {
		// Retourner l'état actuel
		chrome.storage.local.get(["isActive"], (result) => {
			sendResponse({ isActive: result.isActive || false });
		});
		return true;
	}
});

// ==============================================
// GESTION DE L'ACTIVATION/DÉSACTIVATION
// ==============================================
function handleToggle(sendResponse) {
	// Récupérer l'état actuel
	chrome.storage.local.get(["isActive"], (result) => {
		const newState = !result.isActive;
		chrome.storage.local.set({ isActive: newState }, () => {
			console.log(
				`🔄 [Background] Nouveau statut : ${newState ? "activé" : "désactivé"}`
			);

			if (newState) {
				// Activer : Créer l'alarme
				chrome.alarms.create(ALARM_NAME, {
					periodInMinutes: INTERVAL_MINUTES,
				});
				console.log("⏰ [Background] Alarme créée (intervalle: 15s)");
			} else {
				// Désactiver : Supprimer l'alarme
				chrome.alarms.clear(ALARM_NAME);
				console.log("🛑 [Background] Alarme arrêtée");
			}

			sendResponse({ isActive: newState });
		});
	});
}

// ==============================================
// ÉCOUTE DES ALARMES
// ==============================================
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === ALARM_NAME) {
		console.log("🔔 [Background] Alarme déclenchée");
		checkAndShowFlashCard();
	}
});

// ==============================================
// RÉCUPÉRATION DES NOTES ET AFFICHAGE
// ==============================================
async function checkAndShowFlashCard() {
	try {
		// Vérifier si l'extension est active
		const { isActive } = await chrome.storage.local.get(["isActive"]);
		if (!isActive) {
			console.log("⏸️ [Background] Extension désactivée, skip");
			return;
		}

		// Appeler l'API backend
		console.log(
			`🔍 [Background] Appel API : ${API_URL}?intensity=${DEFAULT_INTENSITY}`
		);
		const response = await fetch(`${API_URL}?intensity=${DEFAULT_INTENSITY}`);
		const data = await response.json();

		console.log(`📚 [Background] ${data.count} note(s) récupérée(s)`);

		if (data.notes && data.notes.length > 0) {
			// Sélectionner une note aléatoire
			const randomIndex = Math.floor(Math.random() * data.notes.length);
			const note = data.notes[randomIndex];

			// Envoyer au content-script de l'onglet actif
			sendNoteToActiveTab(note);
		} else {
			console.log("ℹ️ [Background] Aucune note à réviser");
		}
	} catch (error) {
		console.error("❌ [Background] Erreur :", error);
	}
}

// ==============================================
// AFFICHAGE IMMÉDIAT (depuis le popup)
// ==============================================
async function showFlashCardNow() {
	console.log("🎯 [Background] Affichage immédiat demandé");
	await checkAndShowFlashCard();
}

// ==============================================
// ENVOI AU CONTENT-SCRIPT
// ==============================================
function sendNoteToActiveTab(note) {
	// Récupérer l'onglet actif (dans toutes les fenêtres)
	chrome.tabs.query({ active: true }, async (tabs) => {
		if (tabs.length === 0) {
			console.warn("⚠️ [Background] Aucun onglet actif dans aucune fenêtre");
			return;
		}

		// Prioriser l'onglet de la fenêtre focalisée
		const activeTab = tabs.find((tab) => tab.highlighted) || tabs[0];

		// Vérifier que l'URL est valide (pas chrome://, about:, etc.)
		if (
			!activeTab.url ||
			activeTab.url.startsWith("chrome://") ||
			activeTab.url.startsWith("chrome-extension://") ||
			activeTab.url.startsWith("about:")
		) {
			console.warn(
				`⚠️ [Background] Impossible d'injecter sur : ${activeTab.url}`
			);
			console.warn("💡 Ouvre un vrai site web (ex: google.com, youtube.com)");
			return;
		}

		console.log(
			`📤 [Background] Envoi vers onglet ${activeTab.id} : "${note.title}"`
		);

		// Envoyer le message au content-script
		chrome.tabs.sendMessage(
			activeTab.id,
			{
				type: "SHOW_FLASHCARD",
				note: note,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					// Le content-script n'est pas chargé, essayer de l'injecter
					console.warn(
						"⚠️ [Background] Content-script non chargé, injection..."
					);
					injectAndShow(activeTab.id, note);
				} else {
					console.log("✅ [Background] FlashCard affichée");
				}
			}
		);
	});
}

// ==============================================
// INJECTION DYNAMIQUE DU CONTENT-SCRIPT
// ==============================================
async function injectAndShow(tabId, note) {
	try {
		// Injecter le content-script dynamiquement
		await chrome.scripting.executeScript({
			target: { tabId: tabId },
			files: ["content-script.js"],
		});

		console.log("✅ [Background] Content-script injecté");

		// Attendre 100ms que le script se charge
		setTimeout(() => {
			chrome.tabs.sendMessage(
				tabId,
				{
					type: "SHOW_FLASHCARD",
					note: note,
				},
				(response) => {
					if (chrome.runtime.lastError) {
						console.error("❌ [Background] Échec même après injection");
					} else {
						console.log("✅ [Background] FlashCard affichée après injection");
					}
				}
			);
		}, 100);
	} catch (error) {
		console.error("❌ [Background] Erreur injection :", error.message);
		console.warn("💡 Essaye de rafraîchir la page (F5) puis réessaye");
	}
}
