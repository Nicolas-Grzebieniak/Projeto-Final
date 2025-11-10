/*
  catalogo.js (atualizado)
  - Lê livros salvos no localStorage (normaliza formatos)
  - Se não tiver nenhum, gera livros mockados
  - Filtra por gênero
  - Renderiza cards bonitinhos e responsivos
*/

// -------------------- Seletores DOM --------------------
const listaLivros = document.getElementById('listaLivros');
const botoesFiltro = document.querySelectorAll('.botoes-filtro button');

let livros = [];

// -------------------- Utilitários de normalização --------------------
/**
 * Normaliza um objeto de livro vindo de qualquer fonte para o formato:
 * { id, titulo, autor, genero, ano, descricao }
 */
function normalizarLivro(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Verifica os campos mais comuns das duas páginas
  const id = raw.id ?? raw.ID ?? null;

  // titulo pode vir como title ou titulo
  const titulo = raw.titulo ?? raw.title ?? 'Título sem nome';

  // autor pode vir como author ou autor
  const autor = raw.autor ?? raw.author ?? 'Autor desconhecido';

  // genero pode vir como genero ou genre
  const genero = raw.genero ?? raw.genre ?? raw.tipo ?? 'Outros';

  // ano pode vir como ano ou year
  const ano = raw.ano ?? raw.year ?? raw.publicationYear ?? '—';

  // descricao pode vir como descricao ou body
  const descricao = raw.descricao ?? raw.body ?? raw.description ?? '';

  return { id, titulo, autor, genero, ano, descricao };
}

/**
 * Normaliza um array de livros
 */
function normalizarLista(rawList) {
  return (rawList || [])
    .map(normalizarLivro)
    .filter(Boolean);
}

// -------------------- Mock generator (fallback) --------------------
function gerarMockLivros() {
  const generos = ['Romance', 'Ação', 'Aventura', 'Terror', 'Ficção'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `mock-${i + 1}`,
    titulo: `Livro Exemplo ${i + 1}`,
    autor: `Autor Exemplo ${i + 1}`,
    genero: generos[i % generos.length],
    ano: 2010 + (i % 14),
    descricao: 'Descrição de exemplo para este livro. Adicione novos livros na página principal!'
  }));
}

// -------------------- Renderização --------------------
function renderLivros(lista) {
  listaLivros.innerHTML = '';

  if (!lista || lista.length === 0) {
    listaLivros.innerHTML = '<p style="color:white;text-align:center;">Nenhum livro encontrado.</p>';
    return;
  }

  lista.forEach(livro => {
    const card = document.createElement('div');
    card.classList.add('card-livro');
    card.innerHTML = `
      <strong>${escapeHtml(livro.titulo)}</strong>
      <p class="autor">Autor: ${escapeHtml(livro.autor)}</p>
      <p class="genero">Gênero: ${escapeHtml(livro.genero)}</p>
      <p class="ano">Ano: ${escapeHtml(livro.ano)}</p>
      <p class="descricao">${escapeHtml(livro.descricao)}</p>
    `;
    listaLivros.appendChild(card);
  });
}

// Pequeno escape para evitar injeção ao usar innerHTML
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// -------------------- Carregamento (localStorage + fallback) --------------------
function carregarLivrosLocal() {
  try {
    const raw = localStorage.getItem('livros');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const norm = normalizarLista(parsed);
    return norm.length ? norm : null;
  } catch (err) {
    console.warn('Erro ao parsear localStorage:', err);
    return null;
  }
}

function initCatalogo() {
  // tenta carregar do localStorage primeiro
  const salvos = carregarLivrosLocal();

  if (salvos) {
    livros = salvos;
    renderLivros(livros);
    return;
  }

  // se não houver, busca mocks da API e normaliza
  fetch('https://jsonplaceholder.typicode.com/posts?_limit=12')
    .then(r => r.json())
    .then(data => {
      // transformar posts em nosso formato normalizado
      const generos = ['Romance', 'Ação', 'Aventura', 'Terror', 'Ficção'];
      const mapped = data.map((item, i) => ({
        id: item.id,
        titulo: item.title,
        autor: `Autor ${i + 1}`,
        genero: generos[i % generos.length],
        ano: 2010 + (i % 14),
        descricao: item.body
      }));
      livros = normalizarLista(mapped);
      renderLivros(livros);
    })
    .catch(err => {
      console.error('Erro ao buscar mocks:', err);
      // fallback final: gerar mock local
      livros = gerarMockLivros();
      renderLivros(livros);
    });
}

// -------------------- Filtros --------------------
botoesFiltro.forEach(btn => {
  btn.addEventListener('click', () => {
    botoesFiltro.forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');

    const genero = btn.dataset.genero;
    if (genero === 'Todos') renderLivros(livros);
    else renderLivros(livros.filter(l => l.genero === genero));
  });
});

// -------------------- Inicialização --------------------
initCatalogo();
