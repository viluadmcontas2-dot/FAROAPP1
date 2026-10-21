# 0005 — O app só funciona instalado
**Decisão:** no navegador comum o Faro mostra como instalar; o uso real é no PWA instalado.
**Por quê:** é um app de uso diário no carro; instalado abre em tela cheia, funciona offline e guarda dados de forma mais estável.
**Consequência:** `src/ui/install-gate.js` e o detector de instalação decidem a tela; testes `app-instalacao-*`.
