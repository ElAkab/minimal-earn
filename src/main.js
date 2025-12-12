import "flowbite";

// =====================
// Sélection d'éléments
// =====================
let progBtns = document.querySelectorAll(".check-btn");
let noteTitleInput = document.getElementById("note-title");
let noteDescInput = document.getElementById("notes-desc");
let radioChill = document.getElementById("helper-radio-4");
let radioModerate = document.getElementById("helper-radio-5");
let radioIntensive = document.getElementById("helper-radio-6");
let submitBtn = document.getElementById("submit-form");

// Choix de l'IA
const AI = {
	claudeCode: false,
	gemma3: false,
};

// =====================
// Gestion du click > IA
// =====================
progBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
		// Récupère le type d'IA associé au bouton via l'attribut data-ai
		const aiType = btn.dataset.ai;

		// Ignore si le bouton n'a pas de type valide
		if (!aiType || !AI.hasOwnProperty(aiType)) return;

		// Si l'IA correspondante est déjà activée → la désactive
		if (AI[aiType]) {
			AI[aiType] = false;
			console.log(`${aiType} = false`);
		} else {
			// Sinon, désactive toutes les autres IA
			for (const key in AI) AI[key] = false;
			// Active uniquement l'IA correspondante
			AI[aiType] = true;
			console.log(`${aiType} = true`);
		}
	});
});

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
	// Filtrer les éléments non "true"
	// =====================
	const trueEl = Object.keys(AI).filter((key) => AI[key] === true);

	// =====================
	// Préparation de l'objet à envoyer
	// =====================
	const payload = {
		AI: trueEl,
		title: noteTitle,
		description: noteDesc,
		// "intensity" will be added based on radio selection
	};

	// =====================
	// Gestion des radios
	// =====================
	if (radioChill.checked) {
		payload.intensity = "chill";
	} else if (radioModerate.checked) {
		payload.intensity = "moderate";
	} else if (radioIntensive.checked) {
		payload.intensity = "intensive";
	}

	try {
		const response = await fetch("/api/generate-note", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log("Response from server:", data);
	} catch (error) {
		// Gérer les erreurs de réseau ou autres
		console.error("Error during fetch:", error);
		alert("Une erreur est survenue lors de la génération de la note.");
	}

	// =====================
	// Affichage du payload dans la console
	// ====================
	// console.log(payload);
	// console.log(
	// 	radioChill.checked,
	// 	radioModerate.checked,
	// 	radioIntensive.checked
	// );
});
