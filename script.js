// script.js
const socket = new WebSocket('ws://localhost:3000');
const board = document.getElementById('board');

// Réception des données du serveur
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    let el = document.getElementById(data.id);
    
    if (!el) {
        el = document.createElement('div');
        el.id = data.id;
        el.className = 'post-it';
        el.contentEditable = true;
        board.appendChild(el);
    }
    
    el.style.left = data.x + 'px';
    el.style.top = data.y + 'px';
    el.innerText = data.text || "";
};

// Fonction pour créer et envoyer un post-it
function addPostIt() {
    const id = 'note_' + Math.random().toString(36).substr(2, 9);
    const msg = { id: id, x: 50, y: 50, text: "Nouveau" };
    socket.send(JSON.stringify(msg));
}

// Gestion du déplacement (Drag & Drop simplifié)
document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('post-it')) {
        const el = e.target;
        const move = (me) => {
            const msg = { 
                id: el.id, 
                x: me.clientX - 75, 
                y: me.clientY - 75, 
                text: el.innerText 
            };
            socket.send(JSON.stringify(msg));
        };
        document.onmousemove = move;
        document.onmouseup = () => document.onmousemove = null;
    }
});