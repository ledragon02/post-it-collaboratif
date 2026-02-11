const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3000;
const FICHIER_SAUVEGARDE = 'sauvegarde.json';
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {};

// Fonction pour charger les donnees au demarrage du serveur
function chargerDonnees() {
    if (fs.existsSync(FICHIER_SAUVEGARDE)) {
        try {
            const contenu = fs.readFileSync(FICHIER_SAUVEGARDE, 'utf-8');
            memoirePostIts = JSON.parse(contenu);
            console.log("Systeme : Donnees chargees depuis le fichier de sauvegarde");
        } catch (erreur) {
            console.log("Erreur : Impossible de lire le fichier de sauvegarde");
            memoirePostIts = {};
        }
    }
}

// Fonction pour enregistrer les donnees sur le disque
function sauvegarderDonnees() {
    try {
        fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(memoirePostIts, null, 2));
    } catch (erreur) {
        console.log("Erreur : Echec de l'ecriture du fichier de sauvegarde");
    }
}

chargerDonnees();

wss.on('connection', (ws) => {
    console.log("Serveur : Nouvelle connexion client");

    // Envoi de l'etat actuel du tableau au nouveau client
    Object.values(memoirePostIts).forEach(note => {
        ws.send(JSON.stringify(note));
    });

    ws.on('message', (messageBrut) => {
        const donnees = JSON.parse(messageBrut);

        if (donnees.type === 'SUPPRESSION') {
            console.log("Action : Suppression de la note " + donnees.idPostIt);
            delete memoirePostIts[donnees.idPostIt];
        } else {
            console.log("Action : Mise a jour de la note " + donnees.idPostIt);
            memoirePostIts[donnees.idPostIt] = donnees;
        }

        // Sauvegarde immediate apres chaque modification
        sauvegarderDonnees();

        // Diffusion du message a tous les clients connectes
        const diffusion = JSON.stringify(donnees);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(diffusion);
            }
        });
    });

    ws.on('close', () => {
        console.log("Serveur : Client deconnecte");
    });
});

console.log("Serveur lance sur le port " + PORT);