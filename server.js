const WebSocket = require('ws');
const fs = require('fs');

const PORT = 3000;
const FICHIER_SAUVEGARDE = 'sauvegarde.json';
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {};
let historiqueChat = [];
const MAX_CHAT_LOGS = 100;

// --- CHARGEMENT DES DONNÉES ---
if (fs.existsSync(FICHIER_SAUVEGARDE)) {
    try {
        const data = JSON.parse(fs.readFileSync(FICHIER_SAUVEGARDE, 'utf-8'));
        memoirePostIts = data.notes || {};
        historiqueChat = data.chat || [];
        console.log(">> [SYSTÈME] Données et historique chargés.");
    } catch (e) { 
        console.log(">> [ERREUR] Erreur de lecture, base vide.");
        memoirePostIts = {}; 
        historiqueChat = [];
    }
}

function diffuserNombreUtilisateurs() {
    const msg = JSON.stringify({ 
        type: 'NB_UTILISATEURS', 
        count: wss.clients.size 
    });
    wss.clients.forEach(c => { 
        if (c.readyState === WebSocket.OPEN) {
            c.send(msg); 
        }
    });
}

function sauvegarder() {
    const data = { 
        notes: memoirePostIts, 
        chat: historiqueChat 
    };
    fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(data, null, 2));
}

wss.on('connection', (ws) => {
    // Envoyer l'existant au nouveau client
    Object.values(memoirePostIts).forEach(note => {
        ws.send(JSON.stringify(note));
    });
    
    historiqueChat.forEach(msg => {
        ws.send(JSON.stringify(msg));
    });
    
    diffuserNombreUtilisateurs();
    console.log(`>> [CONNEXION] Utilisateur connecté. Total : ${wss.clients.size}`);

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const id = data.idPostIt || data.idLien;
        const auteur = data.auteur || "Anonyme";

        // --- GESTION DES MESSAGES ---
        if (data.type === 'MAJ' || data.type === 'IMAGE') {
            if (!memoirePostIts[id]) {
                console.log(`[CRÉATION] ${auteur} a créé ${id}`);
            } else if (data.posX !== undefined) {
                console.log(`[MAJ] ${auteur} déplace ${id} (X: ${Math.round(data.posX)}, Y: ${Math.round(data.posY)})`);
            }
            memoirePostIts[id] = { ...(memoirePostIts[id] || {}), ...data };
            sauvegarder();
        } 
        
        else if (data.type === 'CHAT') {
            historiqueChat.push(data);
            if (historiqueChat.length > MAX_CHAT_LOGS) {
                historiqueChat.shift();
            }
            console.log(`[CHAT] ${auteur}: ${data.message}`);
            sauvegarder();
        }

        else if (data.type === 'CLEAR_CHAT') {
            historiqueChat = [];
            console.log(`[SYSTÈME] Chat vidé par ${auteur}`);
            sauvegarder();
        }

        else if (data.type === 'LIEN') {
            memoirePostIts[id] = data;
            console.log(`[LIEN] ${auteur} a relié des éléments`);
            sauvegarder();
        }

        else if (data.type === 'SUPPRESSION') {
            delete memoirePostIts[id];
            console.log(`[SUPPRESSION] ${id} par ${auteur}`);
            sauvegarder();
        }

        // --- DIFFUSION ---
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                // Ne pas renvoyer son propre curseur
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