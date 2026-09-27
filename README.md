# personal-page

Site pessoal de Natan Klein, em HTML, CSS e JavaScript, bilíngue (PT-BR/EN) e publicado no GitHub Pages.

Endereço: https://klein-natan.github.io/personal-page/

## Publicar um artigo novo

1. Crie um arquivo `.md` em `content/articles/`. Você pode criá-lo à mão ou com o comando:

   ```sh
   npm run new -- "Título do meu artigo"
   ```

2. Escreva o texto em Markdown abaixo do cabeçalho:

   ```markdown
   ---
   title: "Título do meu artigo"
   date: 2026-10-01
   lang: pt              # idioma original: pt ou en
   summary: "Uma ou duas frases que aparecem na lista de artigos."
   tags: [IA, educação]
   draft: true           # apague esta linha para publicar
   ---

   Texto do artigo...
   ```

3. Faça commit e push. O GitHub Actions gera o site e publica sozinho, em cerca de um minuto.

**Tradução (opcional):** crie um arquivo com o mesmo nome e o sufixo do idioma, como `meu-artigo.en.md`, com `title` e `summary` traduzidos. O botão PT/EN passa a trocar o texto. Sem tradução, o artigo aparece no idioma original com o aviso "disponível apenas em português".

**Imagens:** coloque os arquivos em `content/articles/assets/` e use `![descrição](assets/foto.jpg)`.

**Recursos do Markdown:** negrito, itálico, links, listas, citações, tabelas, blocos de código, notas de rodapé (`[^1]`) e separador (`---`). O arquivo `content/articles/exemplo-de-artigo.md` mostra todos eles. Ele é um rascunho e não é publicado.

Também dá para pedir ao Claude: "publique este markdown como artigo".

## Ver o site no computador

```sh
npm install        # só na primeira vez
npm run dev        # gera o site com os rascunhos e abre em http://localhost:8080
```

## Onde editar cada coisa

| O quê | Arquivo |
|---|---|
| Texto das abas (Bio, Pesquisa, Docência, Clínica, Mentoria, Contato, CV) | `src/pages/*.html` |
| Menu, cabeçalho e rodapé | `src/layout.html` e a lista `NAV` em `scripts/build.js` |
| E-mail, WhatsApp, CRP e links | `data/site.json` |
| Publicações científicas | `data/publications.json` |
| Projetos | `data/projects.json` |
| Cores e tipografia | `assets/css/style.css` (as variáveis ficam no topo) |

Nas páginas, cada texto aparece duas vezes, uma por idioma:

```html
<span data-lang="pt">Olá</span><span data-lang="en">Hello</span>
```

Os placeholders `{{...}}`, como `{{site.email}}` e `{{publications}}`, são preenchidos pelo build.

## Estrutura

```
content/articles/   artigos em Markdown (+ assets/ para imagens)
src/layout.html     moldura comum das páginas
src/pages/          conteúdo de cada aba
data/               dados em JSON
assets/             CSS, JS e imagens
scripts/            build.js (gera _site/), serve.js, new-article.js
_site/              site gerado (não vai para o git)
```

## Primeira publicação no GitHub Pages

No repositório, em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**. A partir daí, cada push na branch `main` publica o site.
