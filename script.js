// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qpkpxodceqyzafzdleej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa3B4b2RjZXF5emFmemRsZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDI5MTAsImV4cCI6MjA2ODY3ODkxMH0.0bR-qzCk-LMwuQ72NcqI3ibuOZrow5uTZZaeh-6k7tg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTOS DO HTML
const messagesWindow = document.getElementById('messages-window');
const usernameInput = document.getElementById('username');
const messageTextInput = document.getElementById('message-text');
const sendButton = document.getElementById('send-button');
// O elemento do botão de limpar foi removido

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
    if (!user || !text) { alert('Por favor, preencha o nome e a mensagem!'); return; }
    const { error } = await supabaseClient.from('messages').insert([{ user: user, text: text }]);
    if (error) { console.error('Erro ao enviar mensagem:', error); } else { messageTextInput.value = ''; }
}

// FUNÇÃO DE LIMPEZA MODIFICADA (SEM CONFIRMAÇÃO)
async function clearChat() {
    console.log('Iniciando limpeza automática do chat...');

    // Deleta todas as mensagens da tabela
    const { error } = await supabaseClient
        .from('messages')
        .delete()
        .gt('id', 0); // gt = greater than

    if (error) {
        console.error('Erro ao limpar o chat automaticamente:', error);
    } else {
        console.log('Chat limpo com sucesso no banco de dados.');
    }
}

function addMessageToWindow(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `<strong>${message.user}</strong>${message.text}`;
    messagesWindow.prepend(messageDiv);
}

// 4. MÁGICA EM TEMPO REAL E EVENTOS

sendButton.addEventListener('click', sendMessage);
// O evento do botão de limpar foi removido

messageTextInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

const channel = supabaseClient.channel('chat-realtime');
channel
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      addMessageToWindow(payload.new);
    }
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'messages' },
    (payload) => {
      messagesWindow.innerHTML = '';
    }
  )
  .subscribe();

// LÓGICA NOVA: TEMPORIZADOR PARA LIMPEZA AUTOMÁTICA
// Executa a função clearChat a cada 2 minutos (120,000 milissegundos)
setInterval(clearChat, 2 * 60 * 1000);


// Carrega as mensagens iniciais quando a página é aberta
fetchMessages();