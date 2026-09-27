// Gera o site em _site/ a partir de:
//   src/layout.html        moldura comum (cabeçalho, menu, rodapé)
//   src/pages/*.html       conteúdo de cada aba
//   content/articles/*.md  artigos em Markdown
//   data/*.json            dados do site, publicações e projetos
//
// Uso: node scripts/build.js [--drafts]

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const INCLUDE_DRAFTS = process.argv.includes('--drafts');
const LANGS = ['pt', 'en'];
const LANG_NAME = {
  pt: { pt: 'português', en: 'Portuguese' },
  en: { pt: 'inglês', en: 'English' },
};

const readText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(readText(p));

const site = readJSON('data/site.json');
const publications = readJSON('data/publications.json');
const projects = readJSON('data/projects.json');
const layout = readText('src/layout.html');

// Versão curta de cada arquivo, usada como ?v= no endereço. Quando o arquivo muda, o endereço muda
// e o navegador busca o novo, em vez de usar a cópia antiga do cache.
const assetVersion = (p) => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, p))).digest('hex').slice(0, 10);
const cssVersion = assetVersion('assets/css/style.css');
const jsVersion = assetVersion('assets/js/main.js');

// Abas do menu, na ordem em que aparecem. O nome do arquivo é src/pages/<id>.html.
const NAV = [
  { id: 'index', pt: 'Bio', en: 'Bio' },
  { id: 'artigos', pt: 'Artigos', en: 'Writing' },
  { id: 'projetos', pt: 'Projetos', en: 'Projects' },
  { id: 'pesquisa', pt: 'Pesquisa', en: 'Research' },
  { id: 'docencia', pt: 'Docência', en: 'Teaching' },
  { id: 'clinica', pt: 'Clínica', en: 'Therapy' },
  { id: 'mentoria', pt: 'Mentoria', en: 'Mentoring' },
  { id: 'contato', pt: 'Contato', en: 'Contact' },
];

// ---------- helpers ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Texto bilíngue: aceita string (igual nos dois idiomas) ou { pt, en }.
function bi(value, { escape = true } = {}) {
  const e = escape ? esc : (s) => s;
  if (value == null) return '';
  if (typeof value === 'string') return e(value);
  const pt = value.pt ?? value.en;
  const en = value.en ?? value.pt;
  if (pt === en) return e(pt);
  return `<span data-lang="pt">${e(pt)}</span><span data-lang="en">${e(en)}</span>`;
}

function isoDate(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  throw new Error(`Data inválida: "${d}" (use AAAA-MM-DD)`);
}

function formatDate(iso, lang) {
  return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

const biDate = (iso) => bi({ pt: formatDate(iso, 'pt'), en: formatDate(iso, 'en') });

// Substitui {{chave}} e {{chave.sub}}. Chave desconhecida é erro, para não publicar "{{...}}" por engano.
function fill(tpl, vars, source) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
    if (v === undefined) throw new Error(`${source}: placeholder desconhecido ${m}`);
    return typeof v === 'object' ? bi(v) : v;
  });
}

function writeOut(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ---------- artigos ----------

// Um Marked por idioma: as notas de rodapé das duas versões ficam na mesma página e precisam de ids distintos.
const markdown = Object.fromEntries(
  LANGS.map((l) => [l, new Marked({ gfm: true }).use(markedFootnote({ prefixId: `nota-${l}-`, description: l === 'pt' ? 'Notas' : 'Notes' }))])
);

function loadArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const groups = new Map();

  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.md') || file.startsWith('_') || file.toLowerCase() === 'readme.md') continue;
    const [, slug, suffix] = file.match(/^(.+?)(?:\.(pt|en))?\.md$/);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`content/articles/${file}: use só letras minúsculas, números e hífens no nome (ex.: meu-artigo.md)`);
    }
    const { data, content } = matter(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8'));
    const lang = suffix || data.lang || 'pt';
    if (!LANGS.includes(lang)) throw new Error(`content/articles/${file}: lang deve ser "pt" ou "en"`);

    const group = groups.get(slug) ?? { slug, versions: {} };
    if (group.versions[lang]) throw new Error(`Artigo "${slug}" tem duas versões em "${lang}"`);
    group.versions[lang] = { lang, data, body: content, file, original: !suffix };
    groups.set(slug, group);
  }

  const articles = [];
  for (const g of groups.values()) {
    const versions = Object.values(g.versions);
    const original = versions.find((v) => v.original) ?? versions[0];
    for (const v of versions) {
      if (!v.data.title) throw new Error(`content/articles/${v.file}: falta "title" no cabeçalho`);
      const words = v.body.split(/\s+/).filter(Boolean).length;
      v.minutes = Math.max(1, Math.round(words / 200));
      v.html = markdown[v.lang].parse(v.body);
    }
    if (!original.data.date) throw new Error(`content/articles/${original.file}: falta "date" no cabeçalho`);
    const draft = Boolean(original.data.draft);
    if (draft && !INCLUDE_DRAFTS) continue;

    const pick = (field) => {
      const out = {};
      for (const l of LANGS) out[l] = (g.versions[l] ?? original).data[field];
      return out;
    };

    articles.push({
      slug: g.slug,
      date: isoDate(original.data.date),
      draft,
      originalLang: original.lang,
      versions: g.versions,
      title: pick('title'),
      summary: pick('summary'),
      tags: original.data.tags ?? [],
    });
  }
  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

function articleListHTML(articles, { limit, root = '' } = {}) {
  const items = limit ? articles.slice(0, limit) : articles;
  if (!items.length) {
    return `<p class="empty">${bi({ pt: 'Os primeiros textos chegam em breve.', en: 'The first pieces are coming soon.' })}</p>`;
  }
  return `<ul class="post-list">${items
    .map((a) => {
      const onlyOne = Object.keys(a.versions).length === 1;
      const badge = onlyOne
        ? `<span class="badge" data-lang="${a.originalLang === 'pt' ? 'en' : 'pt'}">${
            a.originalLang === 'pt' ? 'In Portuguese' : 'Em inglês'
          }</span>`
        : '';
      const draft = a.draft ? `<span class="badge badge-draft">rascunho</span>` : '';
      return `
      <li class="post">
        <a href="${root}artigos/${a.slug}.html">
          <p class="post-meta"><time datetime="${a.date}">${biDate(a.date)}</time>${badge}${draft}</p>
          <h3 class="post-title">${bi(a.title)}</h3>
          ${a.summary.pt || a.summary.en ? `<p class="post-summary">${bi(a.summary)}</p>` : ''}
        </a>
      </li>`;
    })
    .join('')}
  </ul>`;
}

function articlePageHTML(a) {
  const langs = Object.keys(a.versions);
  const both = langs.length === 2;
  const blocks = langs.map((l) => {
    const v = a.versions[l];
    const tags = (v.data.tags ?? a.tags).map((t) => `<li>${esc(t)}</li>`).join('');
    const inner = `
      <header class="article-header">
        <p class="eyebrow"><time datetime="${a.date}">${formatDate(a.date, l)}</time> · ${v.minutes} min ${l === 'pt' ? 'de leitura' : 'read'}</p>
        <h1>${esc(v.data.title)}</h1>
        ${v.data.summary ? `<p class="lede">${esc(v.data.summary)}</p>` : ''}
      </header>
      <div class="prose" lang="${l === 'pt' ? 'pt-BR' : 'en'}">${v.html}</div>
      ${tags ? `<ul class="tags">${tags}</ul>` : ''}`;
    return both ? `<div data-lang="${l}">${inner}</div>` : inner;
  });

  let notice = '';
  if (!both) {
    const other = langs[0] === 'pt' ? 'en' : 'pt';
    const name = LANG_NAME[langs[0]][other];
    notice = `<p class="notice" data-lang="${other}">${
      other === 'en' ? `This piece is only available in ${name}.` : `Este texto está disponível apenas em ${name}.`
    }</p>`;
  }

  return `
  <article class="article">
    <a class="back-link" href="../artigos.html">← ${bi({ pt: 'Todos os artigos', en: 'All writing' })}</a>
    ${notice}
    ${blocks.join('\n')}
  </article>`;
}

// ---------- blocos reutilizados pelas páginas ----------

function publicationsHTML() {
  return `<ol class="pub-list">${publications
    .map(
      (p) => `
    <li class="pub">
      <p class="pub-year">${p.year}</p>
      <div>
        <p class="pub-title"><a href="https://doi.org/${esc(p.doi)}">${esc(p.title)}</a></p>
        <p class="pub-authors">${esc(p.authors).replace('Klein, N.', '<strong>Klein, N.</strong>')}</p>
        <p class="pub-venue"><em>${esc(p.venue)}</em>, ${esc(p.details)}. <span class="doi">doi:${esc(p.doi)}</span></p>
        ${p.summary ? `<p class="pub-summary">${bi(p.summary)}</p>` : ''}
      </div>
    </li>`
    )
    .join('')}
  </ol>`;
}

function publicationsCompactHTML() {
  return `<ol class="cv-pubs">${publications
    .map(
      (p) =>
        `<li>${esc(p.authors).replace('Klein, N.', '<strong>Klein, N.</strong>')} (${p.year}). ${esc(p.title)}. <em>${esc(p.venue)}</em>, ${esc(p.details)}. <a href="https://doi.org/${esc(p.doi)}">doi:${esc(p.doi)}</a></li>`
    )
    .join('')}</ol>`;
}

function projectsHTML() {
  return `<div class="card-grid">${projects
    .map(
      (p) => `
    <article class="card">
      <h3>${bi(p.title)}</h3>
      <p>${bi(p.description)}</p>
      <ul class="tags">${p.tags.map((t) => `<li>${bi(t)}</li>`).join('')}</ul>
      <p class="card-links">${p.links.map((l) => `<a href="${esc(l.url)}">${bi(l.label)} →</a>`).join('')}</p>
    </article>`
    )
    .join('')}
  </div>`;
}

// ---------- montagem das páginas ----------

function navHTML(active, root) {
  return NAV.map(
    (n) =>
      `<li><a href="${root}${n.id}.html"${n.id === active ? ' aria-current="page"' : ''}>${bi(n)}</a></li>`
  ).join('');
}

function renderPage({ outPath, active, title, description, content, root }) {
  const t = typeof title === 'string' ? { pt: title, en: title } : title;
  const full = (s) => (active === 'index' ? `${site.name} — ${s}` : `${s} · ${site.name}`);
  const d = description ?? site.description;
  // O conteúdo entra por último para que um "{{...}}" dentro de um artigo não seja interpretado.
  return fill(
    layout,
    {
      root,
      titlePt: esc(full(t.pt ?? t.en)),
      titleEn: esc(full(t.en ?? t.pt)),
      description: esc(typeof d === 'string' ? d : d.pt),
      canonical: `${site.url}/${outPath === 'index.html' ? '' : outPath}`,
      ogImage: `${site.url}/assets/img/og.jpg`,
      nav: navHTML(active, root),
      cssVersion,
      jsVersion,
      content: '<!--CONTENT-->',
      site,
      year: String(new Date().getFullYear()),
    },
    outPath
  ).replace('<!--CONTENT-->', () => content);
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  const articleAssets = path.join(ARTICLES_DIR, 'assets');
  if (fs.existsSync(articleAssets)) fs.cpSync(articleAssets, path.join(OUT, 'artigos', 'assets'), { recursive: true });
  writeOut('.nojekyll', '');

  const articles = loadArticles();

  const vars = {
    site,
    whatsappLink: `https://wa.me/${site.whatsapp}`,
    articles: articleListHTML(articles),
    recentArticles: articleListHTML(articles, { limit: 3 }),
    projects: projectsHTML(),
    publications: publicationsHTML(),
    publicationsCompact: publicationsCompactHTML(),
    year: String(new Date().getFullYear()),
  };

  const pagesDir = path.join(ROOT, 'src', 'pages');
  const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'));
  for (const file of pageFiles) {
    const id = file.replace(/\.html$/, '');
    const { data, content } = matter(fs.readFileSync(path.join(pagesDir, file), 'utf8'));
    // O 404 pode ser servido em qualquer caminho, então usa endereços absolutos.
    const root = id === '404' ? `${site.url}/` : '';
    writeOut(
      file,
      renderPage({
        outPath: file,
        active: id,
        title: { pt: data.title_pt, en: data.title_en },
        description: data.description_pt ? { pt: data.description_pt } : undefined,
        content: fill(content, { ...vars, root }, `src/pages/${file}`),
        root,
      })
    );
  }

  for (const a of articles) {
    const orig = a.versions[a.originalLang];
    writeOut(
      `artigos/${a.slug}.html`,
      renderPage({
        outPath: `artigos/${a.slug}.html`,
        active: 'artigos',
        title: a.title,
        description: orig.data.summary ? { pt: orig.data.summary } : undefined,
        content: articlePageHTML(a),
        root: '../',
      })
    );
  }

  writeOut('feed.xml', feedXML(articles.filter((a) => !a.draft)));
  writeOut(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
      ...pageFiles.filter((f) => f !== '404.html').map((f) => (f === 'index.html' ? '' : f)),
      ...articles.filter((a) => !a.draft).map((a) => `artigos/${a.slug}.html`),
    ]
      .map((p) => `  <url><loc>${site.url}/${p}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );

  console.log(
    `Site gerado em _site/ — ${pageFiles.length} páginas, ${articles.length} artigo(s)${INCLUDE_DRAFTS ? ' (incluindo rascunhos)' : ''}.`
  );
}

function feedXML(articles) {
  const updated = articles[0]?.date ?? new Date().toISOString().slice(0, 10);
  const entries = articles
    .map((a) => {
      const v = a.versions[a.originalLang];
      const url = `${site.url}/artigos/${a.slug}.html`;
      return `  <entry>
    <title>${esc(v.data.title)}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <updated>${a.date}T00:00:00Z</updated>
    ${v.data.summary ? `<summary>${esc(v.data.summary)}</summary>` : ''}
    <content type="html">${esc(v.html)}</content>
  </entry>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)}</title>
  <link href="${site.url}/"/>
  <link rel="self" href="${site.url}/feed.xml"/>
  <id>${site.url}/</id>
  <updated>${updated}T00:00:00Z</updated>
  <author><name>${esc(site.name)}</name></author>
${entries}
</feed>
`;
}

build();
