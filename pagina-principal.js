/*
  pagina-principal.js
  - CRUD usando fetch (JSONPlaceholder /posts)
  - Atualização otimista: o estado local (books) é modificado imediatamente
  - Validações simples: título >= 3 caracteres
  - Pop-up para criar e editar livros
  - Cards responsivos para exibir os livros
  - Código modular e comentado
*/

// -------------------- Configurações --------------------
const API_BASE = 'https://jsonplaceholder.typicode.com/posts';

// Estado local (array de livros)
let books = JSON.parse(localStorage.getItem('livros')) || [];

// Gêneros válidos do site
const generosValidos = ['Romance', 'Ação', 'Aventura', 'Terror', 'Ficção'];

// -------------------- Seletores DOM --------------------
const listaLivros = document.getElementById('listaLivros');
const btnAddLivro = document.getElementById('btnAddLivro');
const popup = document.getElementById('popup');
const fecharPopup = document.getElementById('fecharPopup');
const popupTitulo = document.getElementById('popupTitulo');
const form = document.getElementById('formLivro');
const inputId = document.getElementById('livroId');
const inputTitulo = document.getElementById('titulo');
const inputAutor = document.getElementById('autor');
const inputDescricao = document.getElementById('descricao');
const btnCancelar = document.getElementById('btnCancelar');
const loading = document.getElementById('loading');

function showLoading() {
  loading.style.display = 'flex';
}

function hideLoading(delay = 0) {
  setTimeout(() => {
    loading.style.display = 'none';
  }, delay);
}

// ⚡ Cria select de gênero e input de ano se não existirem (Bloco mantido, pois presume-se que a estrutura HTML final tem esses campos)
let inputGenero, inputAno;
inputGenero = document.getElementById('genero');
inputAno = document.getElementById('ano');

// -------------------- Utilitários --------------------
function abrirPopup(modo = 'criar', livro = null) {
  popup.style.display = 'flex';
  popupTitulo.textContent = modo === 'editar' ? 'Editar Livro' : 'Adicionar Livro';

  if (livro) {
    inputId.value = livro.id;
    inputTitulo.value = livro.title;
    inputAutor.value = livro.author || '';
    inputDescricao.value = livro.body || '';
    // Ajuste para usar os campos criados no HTML
    inputAno.value = livro.year || ''; 
    inputGenero.value = livro.genre || generosValidos[0];
  } else {
    inputId.value = '';
    form.reset();
    // Garante que o gênero selecione o primeiro válido ou o placeholder
    inputGenero.value = generosValidos.includes(inputGenero.value) ? inputGenero.value : ''; 
  }
}

function fecharPopupFunc() {
  popup.style.display = 'none';
  form.reset();
}

fecharPopup.addEventListener('click', fecharPopupFunc);
btnCancelar.addEventListener('click', fecharPopupFunc);
window.addEventListener('click', e => {
  if (e.target === popup) fecharPopupFunc();
});

// -------------------- Renderização --------------------

function renderBooks() {
  listaLivros.innerHTML = '';
  // Mostra apenas os 4 primeiros, como no código original
  const livrosMostrados = books.slice(0, 4); 

  if (livrosMostrados.length === 0) {
    listaLivros.innerHTML = '<p>Nenhum livro cadastrado.</p>';
    return;
  }

  livrosMostrados.forEach(book => {
    const card = document.createElement('div');
    card.classList.add('card-livro');
    card.innerHTML = `
      <strong>${book.title}</strong>
      <p>${book.body}</p>
      <p><em>${book.author || 'Autor desconhecido'}</em></p>
      <p><strong>Gênero:</strong> ${book.genre || '—'} | <strong>Ano:</strong> ${book.year || '—'}</p>
      <div class="acoes-card">
        <button class="editar">Editar</button>
        <button class="excluir">Excluir</button>
      </div>
    `;

    card.querySelector('.editar').addEventListener('click', () => abrirPopup('editar', book));
    card.querySelector('.excluir').addEventListener('click', () => {
      if (confirm(`Deseja realmente excluir "${book.title}"?`)) handleDelete(book.id);
    });

    listaLivros.appendChild(card);
  });

  localStorage.setItem('livros', JSON.stringify(books));
}

// -------------------- Fetch / CRUD --------------------
async function fetchBooks() {
  showLoading();

  try {
    if (books.length > 0) {
      // força o browser a desenhar o loading
      await new Promise(r => setTimeout(r, 50));
      renderBooks();
      return;
    }

    const res = await fetch(API_BASE + '?_limit=10');
    const data = await res.json();

    books = data.map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      author: item.author || 'Desconhecido',
      genre: generosValidos[Math.floor(Math.random() * generosValidos.length)],
      year: 2000 + Math.floor(Math.random() * 25)
    }));

    await new Promise(r => setTimeout(r, 50));
    renderBooks();
  } catch (err) {
    console.error('Erro ao carregar livros', err);
  } finally {
    hideLoading();
  }
}

async function handleCreate(bookData) {
  showLoading(); // Usando showLoading()
  const tempId = Date.now() * -1;
  const optimisticBook = { id: tempId, ...bookData };
  books.unshift(optimisticBook);
  renderBooks();
  fecharPopupFunc(); // Fecha o popup imediatamente após a atualização otimista

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    const serverBook = await res.json();
    const idx = books.findIndex(b => b.id === tempId);
    if (idx !== -1) { // Verifica se ainda está na lista
        books[idx].id = serverBook.id;
        renderBooks();
    }
  } catch (err) {
    console.error('Erro ao criar livro (Rollback)', err);
    books = books.filter(b => b.id !== tempId);
    renderBooks();
    alert('Falha ao salvar o livro no servidor. Tente novamente.');
  } finally {
    hideLoading(); // Usando hideLoading()
  }
}

async function handleUpdate(id, updatedData) {
  showLoading(); // Usando showLoading()
  const idx = books.findIndex(b => b.id == id);
  if (idx === -1) return alert('Livro não encontrado.');

  const oldBook = { ...books[idx] };
  books[idx] = { ...books[idx], ...updatedData };
  renderBooks();
  fecharPopupFunc(); // Fecha o popup imediatamente após a atualização otimista

  try {
    await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
  } catch (err) {
    console.error('Erro ao editar livro (Rollback)', err);
    books[idx] = oldBook;
    renderBooks();
    alert('Falha ao salvar a edição no servidor. Tente novamente.');
  } finally {
    hideLoading(); // Usando hideLoading()
  }
}


async function handleDelete(id) {
  const idx = books.findIndex(b => b.id == id);
  if (idx === -1) return;

  const removed = books[idx];
  books.splice(idx, 1);
  renderBooks();
  showLoading(); // Mostra o loading antes de enviar o delete

  try {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Erro ao deletar livro (Rollback)', err);
    books.splice(idx, 0, removed);
    renderBooks();
    alert('Falha ao excluir o livro no servidor. Tente novamente.');
  } finally {
    hideLoading(); // Esconde o loading após o delete
  }
}

// -------------------- Handlers de UI --------------------
form.addEventListener('submit', async e => {
  e.preventDefault();

  // Validação do Ano
  if (!/^\d{4}$/.test(inputAno.value.trim())) {
    alert('O ano precisa ter exatamente 4 números.');
    return;
  }

  // Validação do Título
  if (inputTitulo.value.trim().length < 3) {
    alert('O título precisa ter pelo menos 3 caracteres.');
    return;
  }
  
  // Verifica se o gênero foi selecionado (útil se o placeholder não tiver valor)
  if (!inputGenero.value.trim()) {
      alert('Selecione um gênero.');
      return;
  }


  const data = {
    title: inputTitulo.value.trim(),
    author: inputAutor.value.trim(),
    body: inputDescricao.value.trim(),
    year: inputAno.value.trim(),
    genre: inputGenero.value.trim()
  };

  const id = inputId.value;

  if (id) {
    await handleUpdate(id, data);
  } else {
    await handleCreate(data);
  }
});

// -------------------- Inicialização --------------------
btnAddLivro.addEventListener('click', () => abrirPopup('criar'));
fetchBooks();