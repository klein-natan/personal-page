---
title: "Exemplo de artigo: o que o Markdown suporta"
date: 2026-09-27
lang: pt
summary: "Um artigo de demonstração com os recursos de formatação disponíveis. Está marcado como rascunho e não aparece no site publicado."
tags: [exemplo]
draft: true
---

Este é um artigo de exemplo. Como tem `draft: true` no cabeçalho, ele só aparece quando você roda `npm run dev` no seu computador. No site publicado, ele fica de fora.

## Formatação básica

Você pode usar **negrito**, *itálico*, [links](https://example.com) e `código`. Listas funcionam como esperado:

- teoria sólida
- quantificação precisa
- recursos tecnológicos

1. Primeiro passo
2. Segundo passo

> Citações ficam destacadas com uma barra lateral.

## Tabelas, código e notas

| Modelo | AUC |
|---|---|
| Regressão logística | 0,81 |
| Gradient boosting | 0,86 |

```python
from sklearn.linear_model import LogisticRegression
model = LogisticRegression().fit(X_train, y_train)
```

Notas de rodapé também funcionam.[^1]

## Imagens

Coloque a imagem em `content/articles/assets/` e use `![descrição](assets/nome-da-imagem.jpg)`.

---

Uma linha com três hifens vira um separador, como o acima.

[^1]: Assim, com `[^1]` no texto e a nota no final.
