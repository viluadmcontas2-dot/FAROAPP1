# Testes do VETTA

A decisão de testar pertence ao agente. O proprietário não precisa escolher navegador, comando ou momento.

## Como a CI funciona

- cada branch ativa possui `.github/workflows/ci-autonomous.yml`;
- o chamador usa o motor canônico da `main` em `.github/workflows/ci-engine.yml`;
- a fotografia exata da branch é baixada;
- o motor descobre automaticamente todos os arquivos `tests/**/*.test.mjs`;
- mudanças funcionais recebem navegador local;
- interface, cálculos integrados, armazenamento e PWA recebem Chromium, Firefox e WebKit;
- ambiente publicado é testado quando `ci/branch-policy.json` declara um alvo e a mudança exige essa prova.

## Execução adicional pelo agente

O issue #2 é a console operacional. O agente pode comentar:

```text
/vetta test netlify/teste-fechado-ux full
/vetta test netlify/teste-fechado published
```

O comando é fechado, não executa texto arbitrário e não altera a branch.

## Evidência

- resultados ficam no GitHub Actions;
- o issue recebe conclusão e link da execução;
- screenshots, traces e relatórios são guardados em falha por dois dias;
- vídeo permanece desligado, salvo investigação específica.

## Limites

CI não substitui validação física de instalação, PWA ou interface no celular. Consulte `TESTING_RULES.md` e `PWA_RULES.md`.
