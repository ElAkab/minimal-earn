import "flowbite";

// =====================
// Sélection d'éléments
// =====================
import { flashCard } from "./components/flashCard.js";
let noteTitleInput = document.getElementById("note-title");
let noteDescInput = document.getElementById("notes-desc");
let radioChill = document.getElementById("helper-radio-4");
let radioModerate = document.getElementById("helper-radio-5");
let radioIntensive = document.getElementById("helper-radio-6");
let submitBtn = document.getElementById("submit-form");

// =====================
// Action du submitBtn
// =====================
submitBtn.addEventListener("click", async (e) => {
	e.preventDefault();
	// =====================
	// Sélection des valeurs
	// =====================
	const noteTitle = noteTitleInput.value;
	const noteDesc = noteDescInput.value;

	// Si le titre est vide on ajoute une bordure rouge et on stoppe l'exécution
	if (noteDesc === "")
		return noteDescInput.classList.add("border", "border-red-500");

	// =====================
	// Filtrer les éléments non "true" (Obsolète)
	// =====================
	// const trueEl = Object.keys(AI).filter((key) => AI[key] === true);

	// =====================
	// Préparation de l'objet à envoyer
	// =====================
	const payload = {
		title: noteTitle,
		content: noteDesc,
		// "intensity" will be added based on radio selection
	};

	// =====================
	// Gestion des radios avec couleurs associées
	// =====================
	if (radioChill.checked) {
		payload.intensity = "Chill";
		payload.color = "blue";
	} else if (radioModerate.checked) {
		payload.intensity = "Sérieux";
		payload.color = "amber";
	} else if (radioIntensive.checked) {
		payload.intensity = "Nécessaire";
		payload.color = "red";
	}

	// =====================
	// Envoi de la requête au serveur
	// =====================
	try {
		const response = await fetch("http://localhost:3000/api/generate-note", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		console.log(response.ok);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log("Response from server:", data);

		alert("Note générée avec succès !");
		noteTitleInput.value = "";
		noteDescInput.value = "";

		flashCard(payload);
	} catch (error) {
		// Gérer les erreurs de réseau ou autres
		console.error("Error during fetch:", error);
		alert("Une erreur est survenue lors de la génération de la note.");
	}

	// ==TEST GENTIL========
	// Affichage du payload dans la console
	// ====================

	// 1 : Affichage simple
	// console.log(payload);
	// console.log(
	// 	radioChill.checked,
	// 	radioModerate.checked,
	// 	radioIntensive.checked
	// );

	// 2 : Affichage du composant flashCard
	// flashCard(payload);
});

// =====================
// TEST DU COMPOSANT flashCard
// =====================
// const payload = {
// 	title: "Exemple de note",
// 	content:
// 		"lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint ",
// 	intensity: "intensive",
// 	color: "red",
// };

// flashCard(payload);
