// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://qpkpxodceqyzafzdleej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa3B4b2RjZXF5emFmemRsZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDI5MTAsImV4cCI6MjA2ODY3ODkxMH0.0bR-qzCk-LMwuQ72NcqI3ibuOZrow5uTZZaeh-6k7tg';

// CORREÇÃO AQUI: Renomeamos a variável para 'supabaseClient' para evitar conflito.
// A biblioteca global que tem a função '.createClient' chama-se 'supabase'.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTOS DO HTML
const messagesWindow = document.getElementById('messages-window');
const usernameInput = document.getElementById('username');
const messageTextInput = document.getElementById('message-text');
const sendButton = document.getElementById('send-button');

// 3. FUNÇÕES DO CHAT

// Função para buscar mensagens existentes e exibi-las na tela
async function fetchMessages() {
    // Usamos 'supabaseClient' aqui
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
    }

    messagesWindow.innerHTML = '';
    data.reverse().forEach(addMessageToWindow);
}

// Função para enviar uma nova mensagem para o banco de dados
async function sendMessage() {
    const user = usernameInput.value.trim();
    const text = messageTextInput.value.trim();

    if (!user || !text) {
        alert('Por favor, preencha o nome e a mensagem!');
        return;
    }

    // Usamos 'supabaseClient' aqui
    const { error } = await supabaseClient
        .from('messages')
        .insert([{ user: user, text: text }]);

    if (error) {
        console.error('Erro ao enviar mensagem:', error);
    } else {
        messageTextInput.value = '';
    }
}

// Função para adicionar uma mensagem na interface gráfica
function addMessageToWindow(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `<strong>${message.user}</strong>${message.text}`;
    messagesWindow.prepend(messageDiv);
}

// 4. MÁGICA EM TEMPO REAL E EVENTOS

sendButton.addEventListener('click', sendMessage);

messageTextInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Usamos 'supabaseClient' aqui
const channel = supabaseClient.channel('chat-realtime');

channel
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('Nova mensagem recebida!', payload.new);
      addMessageToWindow(payload.new);
    }
  )
  .subscribe();

// Carrega as mensagens iniciais quando a página é aberta
fetchMessages();