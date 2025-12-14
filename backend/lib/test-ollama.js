import { testModel } from "./ai.js";

// Test d'un seul modèle
await testModel(
	"hir0rameel/qwen-claude",
	"Explique ce qu'est un callback en JavaScript"
);

// OU tester tous les modèles
// await testAllModels("Qu'est-ce qu'une Promise en JavaScript ?");
