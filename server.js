const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3000;
const FICHIER_SAUVEGARDE = 'sauvegarde.json';
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {};

if (fs.existsSync(FICHIER_SAUVEGARDE)) {
    try {
        memoirePostIts = JSON.parse(fs.readFileSync(FICHIER_SAUVEGARDE, 'utf-8'));
        console.log("Système : Données chargées.");
    } catch (e) { memoirePostIts = {}; }
}

wss.on('connection', (ws) => {
    // Envoyer l'état complet au chargement
    Object.values(memoirePostIts).forEach(item => ws.send(JSON.stringify(item)));

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const id = data.idPostIt || data.idLien;

        if (data.type === 'SUPPRESSION') {
            delete memoirePostIts[id];
        } else if (['MAJ', 'IMAGE', 'LIEN'].includes(data.type)) {
            // FUSION INTELLIGENTE : préserve les coordonnées si on ne met à jour que le texte
            memoirePostIts[id] = { ...(memoirePostIts[id] || {}), ...data };
        }
        
        if (data.type !== 'CURSEUR') {
            fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(memoirePostIts, null, 2));
        }

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                if (data.type === 'CURSEUR' && client === ws) return;
                client.send(JSON.stringify(data));
            }
        });
    });
});