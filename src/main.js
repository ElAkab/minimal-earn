import "flowbite";

// =====================
// Sélection d'éléments
// =====================
import { flashCard } from "./components/flashCard.js";
import { INTENSITY_MAP, getIntensityColor } from "./utils/constants.js";

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
	// Gestion des radios avec intensité + couleur
	// =====================
	if (radioChill.checked) {
		payload.intensity = INTENSITY_MAP.Chill; // 1
		payload.color = getIntensityColor(INTENSITY_MAP.Chill); // "blue"
	} else if (radioModerate.checked) {
		payload.intensity = INTENSITY_MAP.Sérieux; // 2
		payload.color = getIntensityColor(INTENSITY_MAP.Sérieux); // "amber"
	} else if (radioIntensive.checked) {
		payload.intensity = INTENSITY_MAP.Nécessaire; // 3
		payload.color = getIntensityColor(INTENSITY_MAP.Nécessaire); // "red"
	} else {
		// Valeur par défaut si aucun radio n'est sélectionné
		payload.intensity = INTENSITY_MAP.Sérieux; // 2
		payload.color = getIntensityColor(INTENSITY_MAP.Sérieux); // "amber"
	}

	// =====================
	// Envoi de la requête au serveur
	// =====================
	try {
		const response = await fetch("http://localhost:3000/api/notes", {
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
