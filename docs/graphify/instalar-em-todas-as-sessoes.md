# Usar o mapa em todas as sessões

O instalador configura os ganchos globais do Claude em `$HOME/.claude`, preserva as configurações existentes e guarda um backup único em `settings.json.bak-graphify`. Pode rodar a cada container novo. Para testar em outra pasta, defina `GRAPHIFY_GATE_HOME`.

Cole este bloco no **Setup script** do ambiente da nuvem:

```bash
curl -fsSL https://raw.githubusercontent.com/viluadmcontas2-dot/FAROAPP1/main/scripts/graphify-global/instalar-global.sh | bash || true
```

O endereço usa a branch `main` e só passa a funcionar depois do merge. Hoje o arquivo está na branch `claude/faro-2-0-beta-pago`.

Alternativa sem rede, com o repositório disponível:

```bash
bash /home/user/FAROAPP1/scripts/graphify-global/instalar-global.sh || true
```

Vale para sessões e projetos que carregam os ganchos globais do Claude nesse ambiente. Outros clientes precisam de integração própria. Só bloqueia buscas se o comando `graphify` estiver instalado e houver mapa no projeto. O grafo é gerado pelo gancho global `graphify-sync` que já existe; este instalador não instala essa ferramenta nem esse gancho.

Uma consulta libera buscas por 20 minutos; o uso fica em `graphify-out/uso.log`. Para desligar em um projeto, crie `graphify-out/.sem-trava`. Para desligar globalmente, apague de `~/.claude/settings.json` as duas entradas que chamam `graphify-gate.sh` em `PreToolUse` e `PostToolUse`.
