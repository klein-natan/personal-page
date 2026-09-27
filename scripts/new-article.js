// Cria um artigo novo a partir do título.
// Uso: npm run new -- "Título do meu artigo"          (em português)
//      npm run new -- "My article title" --en         (original em inglês)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const lang = args.includes('--en') ? 'en' : 'pt';
const title = args.filter((a) => !a.startsWith('--')).join(' ').trim();

if (!title) {
  console.error('Informe o título: npm run new -- "Título do meu artigo"');
  process.exit(1);
}

const slug = title
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const file = path.join(ROOT, 'content', 'articles', `${slug}.md`);
if (fs.existsSync(file)) {
  console.error(`Já existe: content/articles/${slug}.md`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  file,
  `---
title: "${title.replace(/"/g, '\\"')}"
date: ${today}
lang: ${lang}
summary: ""
tags: []
draft: true
---

Escreva aqui.
`
);
console.log(`Criado content/articles/${slug}.md (como rascunho; remova "draft: true" para publicar).`);
