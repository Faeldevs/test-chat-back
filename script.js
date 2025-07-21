// 1. CONFIGURAÇÃO DO SUPABASE
// Cole aqui a URL e a Chave Anon que você pegou no Passo 1.
const SUPABASE_URL = 'SUA_URL_AQUI'; // ex: 'https://xyz.supabase.co'
const SUPABASE_KEY = 'SUA_CHAVE_ANON_AQUI';

// Cria o "cliente" de conexão com o Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTOS DO HTML
const messagesWindow = document.getElementById('messages-window');
const usernameInput = document.getElementById('username');
const messageTextInput = document.getElementById('message-text');
const sendButton = document.getElementById('send-button');

// 3. FUNÇÕES DO CHAT

// Função para buscar mensagens existentes e exibi-las na tela
async function fetchMessages() {
    // Seleciona todas as mensagens da tabela 'messages', ordenando pelas mais recentes
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
    }

    // Limpa a janela de mensagens antes de adicionar as novas
    messagesWindow.innerHTML = '';
    
    // Inverte a ordem para exibir as mais antigas primeiro
    data.reverse().forEach(addMessageToWindow);
}

// Função para enviar uma nova mensagem para o banco de dados
async function sendMessage() {
    const user = usernameInput.value.trim();
    const text = messageTextInput.value.trim();

    // Validação simples: não envia se o nome ou a mensagem estiverem vazios
    if (!user || !text) {
        alert('Por favor, preencha o nome e a mensagem!');
        return;
    }

    // Insere a nova mensagem na tabela 'messages'
    const { error } = await supabase
        .from('messages')
        .insert([{ user: user, text: text }]);

    if (error) {
        console.error('Erro ao enviar mensagem:', error);
    } else {
        // Limpa o campo de texto após o envio
        messageTextInput.value = '';
    }
}

// Função para adicionar uma mensagem na interface gráfica
function addMessageToWindow(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    // Adiciona o nome do usuário e o texto da mensagem
    messageDiv.innerHTML = `<strong>${message.user}</strong>${message.text}`;
    
    // Adiciona a nova mensagem no início da janela (para manter as novas embaixo com o CSS)
    messagesWindow.prepend(messageDiv);
}


// 4. MÁGICA EM TEMPO REAL E EVENTOS

// Ouve por cliques no botão de enviar
sendButton.addEventListener('click', sendMessage);

// Permite enviar com a tecla "Enter"
messageTextInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});


// Aqui acontece a mágica do tempo real!
// O Supabase vai nos avisar sempre que algo novo for INSERIDO na tabela 'messages'
const channel = supabase.channel('chat-realtime');

channel
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      // Quando uma nova mensagem chega, a função 'addMessageToWindow' é chamada
      console.log('Nova mensagem recebida!', payload.new);
      addMessageToWindow(payload.new);
    }
  )
  .subscribe();


// Carrega as mensagens iniciais quando a página é aberta
fetchMessages();