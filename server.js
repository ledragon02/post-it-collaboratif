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
    Object.values(memoirePostIts).forEach(note => ws.send(JSON.stringify(note)));

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.type === 'SUPPRESSION') {
            delete memoirePostIts[data.idPostIt];
            console.log(`Action : Suppression de ${data.idPostIt}`);
        } else if (data.type === 'MAJ') {
            memoirePostIts[data.idPostIt] = data;
            console.log(`Action : MAJ ${data.idPostIt} -> X: ${Math.round(data.posX)}, Y: ${Math.round(data.posY)}`);
        }
        
        if (data.type !== 'CURSEUR') {
            fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(memoirePostIts, null, 2));
        }

        const diffusion = JSON.stringify(data);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                if (data.type === 'CURSEUR' && client === ws) return;
                client.send(diffusion);
            }
        });
    });
});