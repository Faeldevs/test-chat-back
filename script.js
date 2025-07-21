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

// 3. FUNÇÕES DO CHAT

async function fetchMessages() {
    const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Erro ao buscar mensagens:', error); return; }
    messagesWindow.innerHTML = '';
    data.reverse().forEach(addMessageToWindow);
}

async function sendMessage() {
    const user = usernameInput.value.trim();
    const text = messageTextInput.value.trim();
    if (!user || !text) { 
        alert('Por favor, preencha o nome e a mensagem!'); 
        return; 
    }

    // ===== MUDANÇA AQUI: Salva o nome no localStorage =====
    localStorage.setItem('chatUsername', user);
    
    const { error } = await supabaseClient.from('messages').insert([{ user: user, text: text }]);

    if (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Houve um erro ao enviar a mensagem.');
    } else {
        location.reload();
    }
}

async function clearChat() {
    const passwordAttempt = prompt("Para apagar todas as mensagens, por favor, digite a senha de administrador:");
    if (passwordAttempt === null) {
        return;
    }
    if (passwordAttempt === "lindo") {
        const { error } = await supabaseClient.from('messages').delete().gt('id', 0);
        if (error) {
            console.error('Erro ao limpar o chat:', error);
            alert('Ocorreu um erro ao limpar o chat.');
        }
    } else {
        alert("Senha incorreta!");
    }
}

function addMessageToWindow(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    const userSpan = document.createElement('strong');
    userSpan.textContent = message.user + ':';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = ' ' + message.text;

    messageDiv.appendChild(userSpan);
    messageDiv.appendChild(textSpan);
    
    messagesWindow.prepend(messageDiv);
}

// 4. EVENTOS E LÓGICA EM TEMPO REAL

sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearChat);

messageTextInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') sendMessage();
});

const channel = supabaseClient.channel('chat-realtime');
channel
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    addMessageToWindow(payload.new);
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
    messagesWindow.innerHTML = '';
  })
  .subscribe();

// ===== MUDANÇA AQUI: Carrega o nome salvo ao iniciar a página =====
function loadUsername() {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
    }
}

// Executa as funções iniciais
loadUsername();
fetchMessages();