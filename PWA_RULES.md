<!-- VETTA_GOVERNANCE_VERSION: 2026-08-03.2 -->
# Regras permanentes de PWA do VETTA

Leia este arquivo antes de alterar instalação, manifesto, service worker, cache, ícones, modo standalone, acesso ou publicação.

## Invariantes

- navegador comum deve seguir a experiência de instalação definida pelo produto;
- abertura pelo ícone instalado deve chegar ao aplicativo;
- manifesto, service worker e ícones necessários à instalação devem permanecer acessíveis;
- mudanças de cache não podem servir uma mistura de fotografias incompatíveis;
- dados locais não podem ser apagados por atualização;
- automação de navegador e instalação física são provas diferentes.

## Teste automatizado

A automação deve provar, conforme o caso:

- manifesto válido e ícones disponíveis;
- registro e atualização do service worker;
- navegação offline e estratégia de cache prevista;
- abertura do shell correto;
- barreira de acesso preservada;
- ausência de erros JavaScript;
- comportamento em Chromium, Firefox e WebKit quando aplicável.

O caminho interno usado pelo robô deve ser inequívoco, temporário, revogável e inacessível por simples parâmetro público.

## Identidade do robô

Quando um ambiente protegido precisar ser testado, prefira identidade OIDC temporária do GitHub Actions a senha persistente.

A validação deve restringir:

- emissor e audiência;
- ID imutável do repositório e proprietário;
- workflow canônico;
- executor hospedado pelo GitHub;
- evento e validade temporal.

A sessão emitida para o robô deve durar poucos minutos e usar as mesmas limitações de acesso do site.

## Prova publicada

Configuração de branch não prova publicação. Confirme:

1. URL;
2. branch e pasta esperadas;
3. fotografia atual;
4. conteúdo servido relevante;
5. comportamento no navegador.

## Validação física

Depois da automação, o proprietário deve validar no celular mudanças de:

- instalação;
- atualização;
- abertura pelo ícone;
- modo standalone;
- aparência ou navegação;
- comportamento offline relevante.

Até lá, use **aguardando validação física**.
