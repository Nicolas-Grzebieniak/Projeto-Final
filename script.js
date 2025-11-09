/*
  script.js
  - CRUD usando fetch (JSONPlaceholder /posts)
  - Atualização otimista: o estado local (books) é modificado imediatamente
  - Validações simples: título >= 3 caracteres
  - Mensagens de sucesso/erro e manipulação de loading
  - Código modular e comentado
*/

// -------------------- Configurações --------------------
const API_BASE = 'https://jsonplaceholder.typicode.com/posts';

// Estado local (array de livros)
let books = [];
let isLoading = false;

// -------------------- Seletores DOM --------------------
const mensagemEl = document.getElementById('mensagem');
const form = document.getElementById('formLivro');
const inputId = document.getElementById('livroId');
const inputTitulo = document.getElementById('titulo');
const inputAutor = document.getElementById('autor');
const inputDescricao = document.getElementById('descricao');
const erroTitulo = document.getElementById('erroTitulo');
const listaLivros = document.getElementById('listaLivros');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

// -------------------- Utilitários --------------------
function setLoading(val) {
  isLoading = val;
  if (val) {
    btnSalvar.disabled = true;
    btnCancelar.disabled = true;
  } else {
    btnSalvar.disabled = false;
    btnCancelar.disabled = false;
  }
}

function showMessage(text, type = 'info', timeout = 3500) {
  mensagemEl.textContent = text;
  mensagemEl.className = `msg ${type}`;
  if (timeout) {
    setTimeout(() => {
      // garantir que não sobrescreve mensagens mais recentes
      if (mensagemEl.textContent === text) mensagemEl.textContent = '';
    }, timeout);
  }
}

function findBookIndexById(id) {
  return books.findIndex(b => String(b.id) === String(id));
}

// -------------------- Validações --------------------
function validarTitulo() {
  const val = inputTitulo.value.trim();
  if (val.length < 3) {
    erroTitulo.textContent = 'O título deve ter ao menos 3 caracteres.';
    inputTitulo.setAttribute('aria-invalid', 'true');
    return false;
  }
  erroTitulo.textContent = '';
  inputTitulo.removeAttribute('aria-invalid');
  return true;
}

function validarForm() {
  return validarTitulo();
}

// -------------------- Renderização --------------------
function renderBooks() {
  listaLivros.innerHTML = '';

  if (books.length === 0) {
    listaLivros.innerHTML = '<p>Nenhum livro cadastrado.</p>';
    return;
  }

  const ul = document.createElement('ul');

  books.forEach(book => {
    const li = document.createElement('li');
    li.dataset.id = book.id;

    const titulo = document.createElement('strong');
    titulo.textContent = book.title;

    const autor = document.createElement('span');
    autor.textContent = book.author ? ` — ${book.author}` : '';

    const descricao = document.createElement('p');
    descricao.textContent = book.body || '';

    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => preencherFormularioParaEdicao(book.id));

    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.addEventListener('click', () => handleDelete(book.id));

    li.append(titulo, autor, descricao, btnEditar, btnExcluir);
    ul.appendChild(li);
  });

  listaLivros.appendChild(ul);
}

function preencherFormularioParaEdicao(id) {
  const index = findBookIndexById(id);
  if (index === -1) return showMessage('Livro não encontrado para edição.', 'error');

  const book = books[index];
  inputId.value = book.id;
  inputTitulo.value = book.title;
  inputAutor.value = book.author || '';
  inputDescricao.value = book.body || '';
}

function resetForm() {
  inputId.value = '';
  inputTitulo.value = '';
  inputAutor.value = '';
  inputDescricao.value = '';
  erroTitulo.textContent = '';
}

// -------------------- Fetch / CRUD --------------------
async function fetchBooks() {
  setLoading(true);
  try {
    const res = await fetch(API_BASE + '?_limit=10'); // limitar para performance
    if (!res.ok) throw new Error('Falha ao carregar livros');
    const data = await res.json();
    // Mapear para o nosso formato e adicionar campos simulados
    books = data.map(item => ({ id: item.id, title: item.title, body: item.body, author: item.author || '' }));
    renderBooks();
  } catch (err) {
    showMessage('Erro ao buscar livros: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

// Criação otimista
async function handleCreate(bookData) {
  // criar um id temporário negativo para evitar conflitos
  const tempId = Date.now() * -1;
  const optimisticBook = { id: tempId, ...bookData };
  books.unshift(optimisticBook); // atualiza imediatamente a UI
  renderBooks();
  showMessage('Criando livro...', 'info', 1200);

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: bookData.title, body: bookData.body, userId: 1 })
    });
    if (!res.ok) throw new Error('POST falhou');
    const serverBook = await res.json();

    // substituir o id temporário pelo id retornado pelo servidor
    const idx = findBookIndexById(tempId);
    if (idx !== -1) {
      books[idx].id = serverBook.id;
      renderBooks();
    }
    showMessage('Livro criado com sucesso!', 'success');
  } catch (err) {
    // Reverter mudança otimista
    books = books.filter(b => b.id !== tempId);
    renderBooks();
    showMessage('Erro ao criar livro: ' + err.message, 'error');
  }
}

// Edição otimista
async function handleUpdate(id, updatedData) {
  const idx = findBookIndexById(id);
  if (idx === -1) return showMessage('Livro para editar não encontrado.', 'error');

  // salvar cópia para possível reversão
  const oldBook = { ...books[idx] };
  books[idx] = { ...books[idx], ...updatedData };
  renderBooks();
  showMessage('Atualizando livro...', 'info', 1200);

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: updatedData.title, body: updatedData.body, userId: 1 })
    });
    if (!res.ok) throw new Error('PUT falhou');
    const serverBook = await res.json();

    // opcional: sincronizar campos retornados
    books[idx] = { ...books[idx], ...serverBook };
    renderBooks();
    showMessage('Livro atualizado com sucesso!', 'success');
  } catch (err) {
    // Reverter alteração local
    books[idx] = oldBook;
    renderBooks();
    showMessage('Erro ao atualizar livro: ' + err.message, 'error');
  }
}

// Exclusão otimista
async function handleDelete(id) {
  const idx = findBookIndexById(id);
  if (idx === -1) return showMessage('Livro para excluir não encontrado.', 'error');

  const removed = books[idx];
  books = books.filter(b => b.id !== id);
  renderBooks();
  showMessage('Excluindo livro...', 'info', 1200);

  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('DELETE falhou');
    showMessage('Livro excluído com sucesso!', 'success');
  } catch (err) {
    // Reverter exclusão local
    books.splice(idx, 0, removed);
    renderBooks();
    showMessage('Erro ao excluir livro: ' + err.message, 'error');
  }
}

// -------------------- Handlers de UI --------------------
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!validarForm()) return showMessage('Corrija os erros do formulário.', 'error');

  const payload = {
    title: inputTitulo.value.trim(),
    body: inputDescricao.value.trim(),
    author: inputAutor.value.trim()
  };

  const id = inputId.value;

  if (id) {
    // editar
    await handleUpdate(id, payload);
  } else {
    // criar
    await handleCreate(payload);
  }

  resetForm();
});

btnCancelar.addEventListener('click', (ev) => {
  ev.preventDefault();
  resetForm();
});

inputTitulo.addEventListener('input', validarTitulo);

// -------------------- Inicialização --------------------
// Carrega alguns livros iniciais do JSONPlaceholder para popular a lista
fetchBooks();
