// SQLite : Créer deux tables pour stocker les notes et suivre la progression - Notes et Progression

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Obtenir le chemin absolu du fichier actuel
const __filename = fileURLToPath(import.meta.url);
// Obtenir le répertoire du fichier actuel (dirname() extrait le répertoire d'un chemin de fichier)
const __dirname = dirname(__filename);

// Chemin absolu vers la base de données (à la racine du projet)
const dbPath = join(__dirname, "..", "data", "flashcard.sqlite");

// Recommandation : Utilise ':memory:' pour les tests rapides, ou un chemin de fichier (ex: 'data/flashcard.sqlite')
// pour un stockage persistant. Un chemin vide risque d'être interprété différemment selon le package.
const db = new Database(dbPath); // Stockage persistant dans un fichier, ça évite de perdre les données à chaque redémarrage.

// Activer les clés étrangères de FOREIGN KEY (important pour la cohérence des données)
db.pragma("foreign_keys = ON");

// Création de la table Notes
db.exec(`
    CREATE TABLE IF NOT EXISTS Notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,     -- Titre de la note
        content TEXT,            -- Contenu de la note
        intensity INTEGER NOT NULL,       -- (1) Niveau d'intensité de planification
        color TEXT,              -- (2) Couleur associée à l'intensité de planification
        nextReviewDate DATETIME DEFAULT CURRENT_TIMESTAMP, -- Date de la prochaine révision (commence maintenant)
        easeFactor REAL DEFAULT 2.5,         -- Facteur de facilité (2.5 = valeur initiale selon SM-2)
        currentInterval INTEGER DEFAULT 0,   -- Intervalle actuel en jours
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Date de création
    );
`);

// Création de la table Progression
db.exec(`
    CREATE TABLE IF NOT EXISTS Progression (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL, -- Référence à la note
        reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP, -- Date de la révision
        responseScore REAL NOT NULL, -- Score de la réponse (0-5)
        FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE
    );
`);

export default db;

// INTEGER : pour les nombres entiers
// TEXT : pour les chaînes de caractères
// DATETIME : pour les dates et heures
// DEFAULT CURRENT_TIMESTAMP : pour définir la valeur par défaut à la date et l'heure actuelles
// PRIMARY KEY : pour définir la clé primaire de la table (ça sert à identifier de manière unique chaque enregistrement dans la table. Exemple, on peut utiliser "id" comme clé primaire pour chaque note afin de les différencier les unes des autres)
// FOREIGN KEY : pour définir une clé étrangère qui référence une autre table (ça sert à établir une relation entre deux tables. Exemple, dans la table Progression, on utilise "note_id" comme clé étrangère pour faire référence à l'id de la table Notes, ce qui permet de lier chaque progression à une note spécifique). 1 - FOREIGN KEY = le point de liaison entre deux tables. 2 - On précise la colonne de la table actuelle (note_id) qui va servir de clé étrangère. 3 - On indique la table et la colonne référencée (Notes(id)) pour établir la relation grâce à FOREIGN KEY.
// REAL : pour les nombres à virgule)
