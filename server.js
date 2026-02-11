const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3000;
const FICHIER_SAUVEGARDE = 'sauvegarde.json';
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {};

function chargerDonnees() {
    if (fs.existsSync(FICHIER_SAUVEGARDE)) {
        try {
            const contenu = fs.readFileSync(FICHIER_SAUVEGARDE, 'utf-8');
            memoirePostIts = JSON.parse(contenu);
            console.log("Systeme : Donnees restaurees");
        } catch (e) { memoirePostIts = {}; }
    }
}

function sauvegarderDonnees() {
    fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(memoirePostIts, null, 2));
}

chargerDonnees();

wss.on('connection', (ws) => {
    Object.values(memoirePostIts).forEach(note => ws.send(JSON.stringify(note)));
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.type === 'SUPPRESSION') {
            console.log("Action : Suppression de la note " + data.idPostIt);
            delete memoirePostIts[data.idPostIt];
            sauvegarderDonnees();
        } else if (data.type === 'MAJ') {
            console.log("Action : Mise a jour de la note " + data.idPostIt);
            memoirePostIts[data.idPostIt] = data;
            sauvegarderDonnees();
        }
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                if (data.type === 'CURSEUR' && client === ws) return;
                client.send(JSON.stringify(data));
            }
        });
    });
});
console.log("Serveur pret sur le port " + PORT);