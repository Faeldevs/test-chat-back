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

// 3. ESTADO DO JOGO
let isGameActive = false;
let secretWord = '';
let winners = [];
const adminPassword = "lindo"; // Senha para ações administrativas

// 4. FUNÇÕES

// (As funções fetchMessages, addMessageToWindow, etc., continuam aqui...)
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

function updateRiddleDisplay(riddle) {
    riddleDisplay.textContent = riddle || 'Aguardando o desafio...';
}

function updateWinnersList() {
    winnersList.innerHTML = '';
    winners.forEach(winner => {
        const li = document.createElement('li');
        li.textContent = `🏆 ${winner}`;
        winnersList.appendChild(li);
    });
}

async function postSystemMessage(text) {
    const { error } = await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: text }]);
    if (error) { console.error('Erro ao postar mensagem do sistema:', error); }
}

async function clearChat() {
    const passwordAttempt = prompt("Digite a senha de administrador para limpar o chat:");
    if (passwordAttempt === adminPassword) {
        const { error } = await supabaseClient.from('messages').delete().gt('id', 0);
        if (error) console.error('Erro ao limpar o chat:', error);
    } else if (passwordAttempt !== null) {
        alert("Senha incorreta!");
    }
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

        // COMANDO /novojogo (SEM SENHA)
        if (command === '/novojogo') {
            const newSecretWord = parts[1];
            const riddle = parts.slice(2).join(' ');
            if (!newSecretWord || !riddle) {
                alert('Formato incorreto. Use: /novojogo <palavra-secreta> <charada>');
                return;
            }
            isGameActive = true;
            secretWord = newSecretWord.toLowerCase();
            winners = [];
            updateRiddleDisplay(riddle);
            updateWinnersList();
            await postSystemMessage(`NOVO DESAFIO LANÇADO!`);
            messageTextInput.value = '';
            return;
        }

        // COMANDO /fimdejogo (COM SENHA)
        if (command === '/fimdejogo') {
            const password = parts[1];
            if (password !== adminPassword) {
                alert('Senha de administrador incorreta!');
                return;
            }
            isGameActive = false;
            secretWord = '';
            winners = [];
            updateRiddleDisplay('Aguardando o desafio...');
            updateWinnersList();
            await postSystemMessage('O jogo foi finalizado.');
            messageTextInput.value = '';
            return;
        }
    }

    // --- LÓGICA DE VERIFICAÇÃO DE ACERTO ---
    if (isGameActive && text.toLowerCase().includes(secretWord)) {
        if (winners.includes(user)) {
            alert('Você já acertou esta rodada! Aguarde o próximo desafio.');
            messageTextInput.value = '';
            return;
        } else {
            winners.push(user);
            updateWinnersList();
            await postSystemMessage(`${user} acertou a palavra secreta! Parabéns!`);
            messageTextInput.value = '';
            return;
        }
    }

    // --- Envio de mensagem normal ---
    const { error } = await supabaseClient.from('messages').insert([{ user: user, text: text }]);
    if (error) {
        console.error('Erro ao enviar mensagem:', error);
    } else {
        messageTextInput.value = '';
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

const channel = supabaseClient.channel('chat-realtime');
channel
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    addMessageToWindow(payload.new);
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
    messagesWindow.innerHTML = '';
    // Podemos também limpar a lista de acertadores e a charada aqui se quisermos
    updateRiddleDisplay('');
    updateWinnersList();
  })
  .subscribe();

loadUsername();
fetchMessages();