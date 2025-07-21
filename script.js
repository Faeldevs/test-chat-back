// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qpkpxodceqyzafzdleej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa3B4b2RjZXF5emFmemRsZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDI5MTAsImV4cCI6MjA2ODY3ODkxMH0.0bR-qzCk-LMwuQ72NcqI3ibuOZrow5uTZZaeh-6k7tg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTOS DO HTML
const messagesWindow = document.getElementById('messages-window');
const usernameInput = document.getElementById('username');
const messageTextInput = document.getElementById('message-text');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const riddleDisplay = document.getElementById('riddle-display');
const winnersList = document.getElementById('winners-list');

// 3. ESTADO DO JOGO (variáveis globais)
let gameState = {
    isActive: false,
    secretWord: '',
    riddle: '',
    winners: []
};
const adminPassword = "lindo";

// 4. FUNÇÕES

// ===== FUNÇÕES DE GERENCIAMENTO DE ESTADO =====
function saveGameState() {
    localStorage.setItem('cosmicChatGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('cosmicChatGameState');
    if (savedState) {
        gameState = JSON.parse(savedState);
    }
    updateUIFromState();
}

function clearGameState() {
    gameState = { isActive: false, secretWord: '', riddle: '', winners: [] };
    localStorage.removeItem('cosmicChatGameState');
}

function updateUIFromState() {
    updateRiddleDisplay(gameState.riddle);
    updateWinnersList(gameState.winners);
}

function updateRiddleDisplay(riddle) {
    riddleDisplay.textContent = riddle || 'Aguardando o desafio...';
}

function updateWinnersList(winners) {
    winnersList.innerHTML = '';
    (winners || []).forEach(winner => {
        const li = document.createElement('li');
        li.textContent = `🏆 ${winner}`;
        winnersList.appendChild(li);
    });
}

async function fetchMessages() {
    const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Erro ao buscar mensagens:', error); return; }
    messagesWindow.innerHTML = '';
    data.reverse().forEach(addMessageToWindow);
}

function addMessageToWindow(message) {
    const messageDiv = document.createElement('div');
    if (message.user === 'SISTEMA') {
        messageDiv.classList.add('system-message');
        messageDiv.innerHTML = `<strong>${message.text}</strong>`;
    } else {
        messageDiv.classList.add('message');
        const userSpan = document.createElement('strong');
        userSpan.textContent = message.user + ':';
        const textSpan = document.createElement('span');
        textSpan.textContent = ' ' + message.text;
        messageDiv.appendChild(userSpan);
        messageDiv.appendChild(textSpan);
    }
    messagesWindow.prepend(messageDiv);
}

// ===== FUNÇÃO PRINCIPAL DE ENVIO (LÓGICA ATUALIZADA) =====
async function sendMessage() {
    const user = usernameInput.value.trim();
    const text = messageTextInput.value.trim();
    if (!user || !text) {
        alert('Por favor, preencha o nome e a mensagem!');
        return;
    }
    localStorage.setItem('chatUsername', user);

    // --- LÓGICA DE COMANDOS ---
    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0];

        if (command === '/novojogo') {
            const newSecretWord = parts[1];
            const riddle = parts.slice(2).join(' ');
            if (!newSecretWord || !riddle) {
                alert('Formato incorreto. Use: /novojogo <palavra-secreta> <charada>');
                return;
            }
            gameState = { isActive: true, secretWord: newSecretWord.toLowerCase(), riddle: riddle, winners: [] };
            saveGameState();
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `NOVO DESAFIO LANÇADO!` }]);
            location.reload();
            return;
        }

        if (command === '/fimdejogo') {
            clearGameState();
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `O jogo foi finalizado.` }]);
            location.reload();
            return;
        }
    }

    // --- LÓGICA DE VERIFICAÇÃO DE ACERTO ---
    if (gameState.isActive && text.toLowerCase().includes(gameState.secretWord)) {
        if (gameState.winners.includes(user)) {
            alert('Você já acertou esta rodada!');
            return;
        } else {
            gameState.winners.push(user);
            saveGameState();
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `${user} acertou a palavra secreta! Parabéns!` }]);
            location.reload();
            return;
        }
    }

    // --- Envio de mensagem normal ---
    const { error } = await supabaseClient.from('messages').insert([{ user: user, text: text }]);
    if (error) {
        console.error('Erro ao enviar mensagem:', error);
    } else {
        location.reload();
    }
}

async function clearChat() {
    const passwordAttempt = prompt("Digite a senha de administrador para limpar o chat:");
    if (passwordAttempt === adminPassword) {
        clearGameState();
        await supabaseClient.from('messages').delete().gt('id', 0);
        location.reload();
    } else if (passwordAttempt !== null) {
        alert("Senha incorreta!");
    }
}

// 5. INICIALIZAÇÃO E EVENTOS
function loadUsername() {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) { usernameInput.value = savedUsername; }
}

sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearChat);
messageTextInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') sendMessage(); });

// Inicialização da página
loadUsername();
loadGameState();
fetchMessages();