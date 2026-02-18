const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3000;
const FICHIER_SAUVEGARDE = 'sauvegarde.json';
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {};

if (fs.existsSync(FICHIER_SAUVEGARDE)) {
    try {
        memoirePostIts = JSON.parse(fs.readFileSync(FICHIER_SAUVEGARDE, 'utf-8'));
        console.log(">> Système : Données chargées.");
    } catch (e) { memoirePostIts = {}; }
}

function diffuserNombreUtilisateurs() {
    const nb = wss.clients.size;
    const msg = JSON.stringify({ type: 'NB_UTILISATEURS', count: nb });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
    console.log(`>> Système : ${nb} utilisateur(s) connecté(s).`);
}

wss.on('connection', (ws) => {
    Object.values(memoirePostIts).forEach(note => ws.send(JSON.stringify(note)));
    diffuserNombreUtilisateurs();

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const id = data.idPostIt || data.idLien;
        const auteur = data.auteur || "Anonyme";

        if (data.type === 'SUPPRESSION') {
            delete memoirePostIts[id];
            console.log(`[SUPPRESSION] ${id} par ${auteur}`);
        } 
        else if (data.type === 'MAJ' || data.type === 'IMAGE' || data.type === 'LIEN') {
            if (data.type === 'MAJ' && !memoirePostIts[id]) {
                console.log(`[CRÉATION] Note par ${auteur}`);
            }
            
            memoirePostIts[id] = { ...(memoirePostIts[id] || {}), ...data };
            
            if (data.type === 'MAJ' && data.posX !== undefined) {
                console.log(`[MAJ] ${auteur} déplace ${id} (X: ${Math.round(data.posX)}, Y: ${Math.round(data.posY)})`);
            }
            if (data.type === 'LIEN') console.log(`[LIEN] ${auteur} a relié deux notes`);
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

    ws.on('close', () => {
        diffuserNombreUtilisateurs();
    });
});

console.log(`Serveur en écoute sur le port ${PORT}`);