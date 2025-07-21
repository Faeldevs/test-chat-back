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
// Botão de refresh não é mais necessário
const refreshButton = document.getElementById('refresh-button');
if (refreshButton) { refreshButton.style.display = 'none'; } // Esconde o botão de refresh

// 3. ESTADO DO JOGO
let gameState = {};
const adminPassword = "lindo";

// 4. FUNÇÕES
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function fetchInitialState() {
    const { data, error } = await supabaseClient.from('game_state').select('*').eq('id', 1).single();
    if (error) {
        console.error("Erro ao buscar estado do jogo:", error);
    } else {
        gameState = data;
        updateUIFromState();
    }
    await fetchMessages();
}

function updateUIFromState() {
    riddleDisplay.textContent = gameState.riddle || 'Aguardando o desafio...';
    winnersList.innerHTML = '';
    (gameState.winners || []).forEach(winner => {
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

async function sendMessage() {
    const user = usernameInput.value.trim();
    const text = messageTextInput.value.trim();
    if (!user || !text) { alert('Por favor, preencha o nome e a mensagem!'); return; }
    localStorage.setItem('chatUsername', user);

    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0];

        if (command === '/novojogo') {
            const secret = parts[1];
            const riddleText = parts.slice(2).join(' ');
            if (!secret || !riddleText) { alert('Formato: /novojogo <palavra> <charada>'); return; }
            await supabaseClient.from('game_state').update({ is_active: true, secret_word: normalizeText(secret), riddle: riddleText, winners: [] }).eq('id', 1);
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `NOVO DESAFIO LANÇADO!` }]);
            messageTextInput.value = '';
            return;
        }
    }

    if (gameState.is_active && text.toLowerCase().includes(normalizeText(gameState.secret_word))) {
        if (!gameState.winners.includes(user)) {
            const newWinners = [...gameState.winners, user];
            await supabaseClient.from('game_state').update({ winners: newWinners }).eq('id', 1);
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `${user} acertou a palavra secreta! Parabéns!` }]);
        } else {
            alert('Você já acertou esta rodada!');
        }
        messageTextInput.value = '';
        return;
    }

    const { error } = await supabaseClient.from('messages').insert([{ user: user, text: text }]);
    if (error) {
        console.error('Erro ao enviar mensagem:', error);
    } else {
        messageTextInput.value = '';
    }
}

async function clearChat() {
    const passwordAttempt = prompt("Digite a senha de administrador:");
    if (passwordAttempt === adminPassword) {
        await supabaseClient.from('messages').delete().gt('id', 0);
        await supabaseClient.from('game_state').update({ is_active: false, secret_word: '', riddle: '', winners: [] }).eq('id', 1);
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

supabaseClient.channel('chat-messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    addMessageToWindow(payload.new);
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
    messagesWindow.innerHTML = '';
  })
  .subscribe();

supabaseClient.channel('game-state-updates')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, payload => {
    gameState = payload.new;
    updateUIFromState();
  })
  .subscribe();

loadUsername();
fetchInitialState();
