import { initInterrogationsToggle } from "./config.js";

// =====================
// DONNÉES MOCK
// =====================

/**
 * Données simulées représentant les statistiques d'apprentissage
 * Ces données seront remplacées par de vraies données de l'API plus tard
 */
const mockData = {
	// Taux de réussite par niveau d'intensité
	byIntensity: {
		chill: { correct: 45, incorrect: 5, total: 50 },
		moderate: { correct: 68, incorrect: 12, total: 80 },
		intensive: { correct: 29, incorrect: 4, total: 33 },
	},

	// Progression mensuelle (6 derniers mois)
	monthly: {
		labels: ["Août", "Septembre", "Octobre", "Novembre", "Décembre", "Janvier"],
		correct: [15, 22, 28, 35, 42, 52],
		incorrect: [8, 6, 5, 4, 3, 2],
	},

	// Progression annuelle détaillée (12 mois)
	yearly: {
		labels: [
			"Fév",
			"Mar",
			"Avr",
			"Mai",
			"Juin",
			"Juil",
			"Août",
			"Sep",
			"Oct",
			"Nov",
			"Déc",
			"Jan",
		],
		correct: [8, 12, 15, 18, 22, 28, 32, 38, 45, 52, 58, 65],
		incorrect: [12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2],
	},
};

// =====================
// CONFIGURATION DES COULEURS
// =====================

/**
 * Palette de couleurs cohérente avec le design de l'application
 * Basée sur les couleurs Tailwind CSS utilisées dans l'interface
 */
const colors = {
	// Couleurs par intensité
	chill: {
		bg: "rgba(59, 130, 246, 0.2)", // blue-500 avec transparence
		border: "rgb(59, 130, 246)", // blue-500
	},
	moderate: {
		bg: "rgba(245, 158, 11, 0.2)", // amber-500 avec transparence
		border: "rgb(245, 158, 11)", // amber-500
	},
	intensive: {
		bg: "rgba(239, 68, 68, 0.2)", // red-500 avec transparence
		border: "rgb(239, 68, 68)", // red-500
	},

	// Couleurs pour correct/incorrect
	correct: {
		bg: "rgba(34, 197, 94, 0.2)", // green-500 avec transparence
		border: "rgb(34, 197, 94)", // green-500
	},
	incorrect: {
		bg: "rgba(239, 68, 68, 0.2)", // red-500 avec transparence
		border: "rgb(239, 68, 68)", // red-500
	},

	// Couleurs de texte (pour les labels sur fond sombre)
	text: "rgb(229, 231, 235)", // gray-200
	grid: "rgba(75, 85, 99, 0.3)", // gray-600 avec transparence
};

// =====================
// OPTIONS GLOBALES CHART.JS
// =====================

/**
 * Configuration par défaut pour tous les graphiques
 * Adapte Chart.js au thème sombre de l'application
 */
Chart.defaults.color = colors.text;
Chart.defaults.borderColor = colors.grid;
Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";

// =====================
// GRAPHIQUE 1 : TAUX DE RÉUSSITE PAR INTENSITÉ (Bar Chart)
// =====================

/**
 * Ce graphique compare le taux de réussite selon l'intensité des notes
 * Utilise un graphique en barres horizontales pour faciliter la lecture
 */
function initIntensityChart() {
	const ctx = document.getElementById("intensityChart");
	if (!ctx) return;

	// Calculer les taux de réussite en pourcentage
	const chillRate =
		(mockData.byIntensity.chill.correct / mockData.byIntensity.chill.total) *
		100;
	const moderateRate =
		(mockData.byIntensity.moderate.correct /
			mockData.byIntensity.moderate.total) *
		100;
	const intensiveRate =
		(mockData.byIntensity.intensive.correct /
			mockData.byIntensity.intensive.total) *
		100;

	new Chart(ctx, {
		type: "bar", // Type de graphique : barres
		data: {
			labels: ["Chill", "Modéré", "Intensif"],
			datasets: [
				{
					label: "Taux de réussite (%)",
					data: [chillRate, moderateRate, intensiveRate],
					backgroundColor: [
						colors.chill.bg,
						colors.moderate.bg,
						colors.intensive.bg,
					],
					borderColor: [
						colors.chill.border,
						colors.moderate.border,
						colors.intensive.border,
					],
					borderWidth: 2,
					borderRadius: 8, // Coins arrondis
				},
			],
		},
		options: {
			indexAxis: "y", // Barres horizontales
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: false, // Pas de légende nécessaire ici
				},
				tooltip: {
					backgroundColor: "rgba(17, 24, 39, 0.95)", // gray-900
					padding: 12,
					titleColor: colors.text,
					bodyColor: colors.text,
					borderColor: colors.grid,
					borderWidth: 1,
					// Format personnalisé du tooltip
					callbacks: {
						label: function (context) {
							const intensity = ["chill", "moderate", "intensive"][
								context.dataIndex
							];
							const data = mockData.byIntensity[intensity];
							return [
								`Taux : ${context.parsed.x.toFixed(1)}%`,
								`Correctes : ${data.correct}`,
								`Incorrectes : ${data.incorrect}`,
								`Total : ${data.total}`,
							];
						},
					},
				},
			},
			scales: {
				x: {
					beginAtZero: true,
					max: 100,
					grid: {
						color: colors.grid,
					},
					ticks: {
						callback: function (value) {
							return value + "%";
						},
					},
				},
				y: {
					grid: {
						display: false,
					},
				},
			},
		},
	});
}

// =====================
// GRAPHIQUE 2 : PROGRESSION MENSUELLE (Line Chart)
// =====================

/**
 * Graphique en ligne montrant l'évolution des réponses correctes/incorrectes
 * sur les 6 derniers mois
 */
function initMonthlyChart() {
	const ctx = document.getElementById("monthlyChart");
	if (!ctx) return;

	new Chart(ctx, {
		type: "line", // Type de graphique : ligne
		data: {
			labels: mockData.monthly.labels,
			datasets: [
				{
					label: "Correctes",
					data: mockData.monthly.correct,
					backgroundColor: colors.correct.bg,
					borderColor: colors.correct.border,
					borderWidth: 3,
					fill: true, // Remplir sous la courbe
					tension: 0.4, // Courbe lissée
					pointRadius: 5,
					pointHoverRadius: 7,
				},
				{
					label: "Incorrectes",
					data: mockData.monthly.incorrect,
					backgroundColor: colors.incorrect.bg,
					borderColor: colors.incorrect.border,
					borderWidth: 3,
					fill: true,
					tension: 0.4,
					pointRadius: 5,
					pointHoverRadius: 7,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "top",
					labels: {
						usePointStyle: true, // Utiliser des cercles au lieu de rectangles
						padding: 15,
					},
				},
				tooltip: {
					backgroundColor: "rgba(17, 24, 39, 0.95)",
					padding: 12,
					titleColor: colors.text,
					bodyColor: colors.text,
					borderColor: colors.grid,
					borderWidth: 1,
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					grid: {
						color: colors.grid,
					},
					ticks: {
						precision: 0, // Pas de décimales
					},
				},
				x: {
					grid: {
						color: colors.grid,
					},
				},
			},
			interaction: {
				intersect: false, // Afficher le tooltip même si on n'est pas exactement sur un point
				mode: "index",
			},
		},
	});
}

// =====================
// GRAPHIQUE 3 : RÉPARTITION (Pie Chart)
// =====================

/**
 * Graphique circulaire montrant la proportion de réponses correctes/incorrectes
 * Fournit une vue d'ensemble rapide de la performance globale
 */
function initPieChart() {
	const ctx = document.getElementById("pieChart");
	if (!ctx) return;

	// Calculer les totaux
	const totalCorrect =
		mockData.byIntensity.chill.correct +
		mockData.byIntensity.moderate.correct +
		mockData.byIntensity.intensive.correct;

	const totalIncorrect =
		mockData.byIntensity.chill.incorrect +
		mockData.byIntensity.moderate.incorrect +
		mockData.byIntensity.intensive.incorrect;

	new Chart(ctx, {
		type: "doughnut", // Type : donut (comme pie mais avec un trou au centre)
		data: {
			labels: ["Correctes", "Incorrectes"],
			datasets: [
				{
					data: [totalCorrect, totalIncorrect],
					backgroundColor: [colors.correct.bg, colors.incorrect.bg],
					borderColor: [colors.correct.border, colors.incorrect.border],
					borderWidth: 2,
					hoverOffset: 10, // Décalage au survol
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						padding: 20,
						usePointStyle: true,
					},
				},
				tooltip: {
					backgroundColor: "rgba(17, 24, 39, 0.95)",
					padding: 12,
					titleColor: colors.text,
					bodyColor: colors.text,
					borderColor: colors.grid,
					borderWidth: 1,
					callbacks: {
						label: function (context) {
							const total = totalCorrect + totalIncorrect;
							const percentage = ((context.parsed / total) * 100).toFixed(1);
							return `${context.label}: ${context.parsed} (${percentage}%)`;
						},
					},
				},
			},
		},
	});
}

// =====================
// GRAPHIQUE 4 : ÉVOLUTION ANNUELLE (Mixed Chart)
// =====================

/**
 * Graphique mixte (barres empilées + ligne) montrant l'évolution sur 12 mois
 * Les barres empilées montrent correct/incorrect par mois
 * La ligne montre le taux de réussite en %
 */
function initYearlyChart() {
	const ctx = document.getElementById("yearlyChart");
	if (!ctx) return;

	// Calculer le taux de réussite mensuel
	const successRates = mockData.yearly.correct.map((correct, index) => {
		const total = correct + mockData.yearly.incorrect[index];
		return ((correct / total) * 100).toFixed(1);
	});

	new Chart(ctx, {
		type: "bar", // Type principal : barres
		data: {
			labels: mockData.yearly.labels,
			datasets: [
				{
					label: "Correctes",
					data: mockData.yearly.correct,
					backgroundColor: colors.correct.bg,
					borderColor: colors.correct.border,
					borderWidth: 2,
					borderRadius: 6,
					stack: "stack0", // Empiler avec le dataset suivant
				},
				{
					label: "Incorrectes",
					data: mockData.yearly.incorrect,
					backgroundColor: colors.incorrect.bg,
					borderColor: colors.incorrect.border,
					borderWidth: 2,
					borderRadius: 6,
					stack: "stack0", // Même pile que précédent
				},
				{
					label: "Taux de réussite (%)",
					data: successRates,
					type: "line", // Dataset de type ligne sur graphique en barres
					borderColor: "rgb(99, 102, 241)", // indigo-500
					backgroundColor: "rgba(99, 102, 241, 0.1)",
					borderWidth: 3,
					tension: 0.4,
					fill: false,
					yAxisID: "y1", // Utiliser un axe Y différent
					pointRadius: 4,
					pointHoverRadius: 6,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "top",
					labels: {
						usePointStyle: true,
						padding: 15,
					},
				},
				tooltip: {
					backgroundColor: "rgba(17, 24, 39, 0.95)",
					padding: 12,
					titleColor: colors.text,
					bodyColor: colors.text,
					borderColor: colors.grid,
					borderWidth: 1,
					mode: "index",
					intersect: false,
				},
			},
			scales: {
				y: {
					type: "linear",
					position: "left",
					beginAtZero: true,
					grid: {
						color: colors.grid,
					},
					ticks: {
						precision: 0,
					},
					title: {
						display: true,
						text: "Nombre de réponses",
						padding: 10,
					},
				},
				y1: {
					type: "linear",
					position: "right",
					beginAtZero: true,
					max: 100,
					grid: {
						display: false, // Pas de grille pour le second axe
					},
					ticks: {
						callback: function (value) {
							return value + "%";
						},
					},
					title: {
						display: true,
						text: "Taux de réussite (%)",
						padding: 10,
					},
				},
				x: {
					grid: {
						color: colors.grid,
					},
				},
			},
			interaction: {
				mode: "index",
				intersect: false,
			},
		},
	});
}

// =====================
// INITIALISATION
// =====================

/**
 * Fonction principale exécutée au chargement de la page
 * Initialise le toggle des interrogations et tous les graphiques
 */
async function init() {
	console.log("📊 Initialisation de la page de statistiques...");

	// Initialiser le toggle d'interrogations
	await initInterrogationsToggle("toggle-interrogations");

	// Initialiser tous les graphiques
	initIntensityChart();
	initMonthlyChart();
	initPieChart();
	initYearlyChart();

	console.log("✅ Statistiques initialisées avec succès");
}

// Lancer l'initialisation au chargement du DOM
init();
