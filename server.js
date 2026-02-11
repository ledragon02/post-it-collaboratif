const WebSocket = require('ws');

const PORT = 3000;
const wss = new WebSocket.Server({ port: PORT });

let memoirePostIts = {}; 

wss.on('connection', (ws) => {
    console.log("NOUVELLE CONNEXION DETECTÉE");

    // Envoyer l'état actuel
    const nbNotes = Object.keys(memoirePostIts).length;
    console.log(`Envoi de ${nbNotes} notes existantes au nouveau client.`);
    
    Object.values(memoirePostIts).forEach(postit => {
        ws.send(JSON.stringify(postit));
    });

    ws.on('message', (message) => {
        const donnees = JSON.parse(message);

        // Sauvegarde
        memoirePostIts[donnees.idPostIt] = donnees;

        // Diffusion
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(donnees));
            }
        });
    });

    ws.on('close', () => {
        console.log(" Un client s'est déconnecté.");
    });
});

console.log(` SERVEUR LANCÉ SUR LE PORT ${PORT}`);
console.log("En attente de connexions...");