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
let gameState = {};
const adminPassword = "lindo";

// 4. FUNÇÕES
async function fetchInitialState() {
    const { data, error } = await supabaseClient
        .from('game_state')
        .select('*')
        .eq('id', 1)
        .single();

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
    if (!user || !text) {
        alert('Por favor, preencha o nome e a mensagem!');
        return;
    }
    localStorage.setItem('chatUsername', user);

    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0];

        if (command === '/novojogo') {
            const newSecretWord = parts[1];
            const riddle = parts.slice(2).join(' ');
            if (!newSecretWord || !riddle) {
                alert('Formato incorreto. Use: /novojogo <palavra> <charada>');
                return;
            }
            await supabaseClient
                .from('game_state')
                .update({ is_active: true, secret_word: newSecretWord.toLowerCase(), riddle: riddle, winners: [] })
                .eq('id', 1);
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `NOVO DESAFIO LANÇADO!` }]);
            messageTextInput.value = '';
            return;
        }

        const password = parts[1];
        if (password !== adminPassword) {
            alert('Senha de administrador incorreta!');
            return;
        }

        if (command === '/fimdejogo') {
            await supabaseClient
                .from('game_state')
                .update({ is_active: false, secret_word: '', riddle: '', winners: [] })
                .eq('id', 1);
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `O jogo foi finalizado.` }]);
            messageTextInput.value = '';
            return;
        }
    }

    if (gameState.is_active && gameState.secret_word && text.toLowerCase().includes(gameState.secret_word)) {
        if (gameState.winners.includes(user)) {
            alert('Você já acertou esta rodada!');
        } else {
            const newWinners = [...(gameState.winners || []), user];
            await supabaseClient.from('game_state').update({ winners: newWinners }).eq('id', 1);
            await supabaseClient.from('messages').insert([{ user: 'SISTEMA', text: `${user} acertou a palavra secreta! Parabéns!` }]);
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
    const passwordAttempt = prompt("Digite a senha de administrador para limpar o chat:");
    if (passwordAttempt === adminPassword) {
        await supabaseClient.from('messages').delete().gt('id', 0);
        await supabaseClient
            .from('game_state')
            .update({ is_active: false, secret_word: '', riddle: '', winners: [] })
            .eq('id', 1);
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

// ===== CÓDIGO CORRIGIDO =====
// Listener para o CHAT
supabaseClient.channel('chat-messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    console.log('Nova mensagem recebida!', payload.new);
    // Apenas adiciona a nova mensagem, em vez de recarregar tudo
    addMessageToWindow(payload.new);
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
    console.log('Mensagens deletadas, limpando a tela.');
    // Apenas limpa a janela, em vez de recarregar tudo
    messagesWindow.innerHTML = '';
  })
  .subscribe();

// Listener para o ESTADO DO JOGO
supabaseClient.channel('game-state')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' }, (payload) => {
    console.log('Estado do jogo foi atualizado!', payload.new);
    gameState = payload.new;
    updateUIFromState();
  })
  .subscribe();

// Inicialização da página
loadUsername();
fetchInitialState();