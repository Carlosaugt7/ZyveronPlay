# 🔧 Debug e Testes para LG webOS

## 📋 Problemas Corrigidos (v1.0.2)

### 1. ✅ Navegação por Setas (D-Pad)
**Problema**: Setas do controle não funcionavam, apenas o cursor do mouse.

**Soluções Implementadas**:
- Forçado `cursor: none !important` em todos os elementos via CSS injetado
- Bloqueio completo de eventos de mouse (mousemove, mouseenter, mouseover)
- API webOSSystem.cursor('hidden') ativada
- Foco automático forçado no primeiro elemento focável após 500ms
- Log detalhado de todas as teclas pressionadas para debug

**Como Verificar**:
1. Abra o navegador da TV LG
2. Acesse o app
3. Abra o console (se possível via TV Developer Mode)
4. Verifique os logs:
   - `[Zyveron] Smart TV detectada`
   - `[Zyveron] Cursor do Magic Remote desativado com sucesso`
   - `[Zyveron] Foco inicial aplicado em: BUTTON`
   - `[Zyveron] Tecla pressionada - Code: 37/38/39/40`

---

### 2. ✅ Tecla VOLTAR em Tela Cheia
**Problema**: Pressionando VOLTAR em tela cheia, o app fechava ao invés de voltar.

**Soluções Implementadas**:
- Hook `useSpatialNav` adicionado no componente Player
- Captura específica da tecla VOLTAR (code: 461, 10009, 27, 8)
- `preventDefault()` e `stopPropagation()` forçados
- Proteção no `window.history.popstate` com `preventDefault()`

**Como Verificar**:
1. Entre em tela cheia (assista qualquer canal)
2. Pressione VOLTAR (⬅ RETURN no controle)
3. Deve voltar para lista de canais
4. Verifique o log: `[Player] Tecla VOLTAR pressionada - voltando para lista`

---

### 3. ✅ Áudio Antecipado ao Trocar de Canal
**Problema**: Ao trocar de canal, o áudio do próximo canal começava antes do vídeo, causando sobreposição.

**Soluções Implementadas**:
- `video.pause()` + `video.removeAttribute('src')` antes de trocar
- `requestAnimationFrame()` para aguardar um frame antes de carregar novo stream
- Destruição completa da instância Hls.js anterior
- Event listeners adicionais: `loadstart`, `loadeddata`
- Logs detalhados de cada etapa do carregamento

**Como Verificar**:
1. Entre em um canal qualquer
2. Pressione CIMA ou BAIXO para trocar de canal rapidamente
3. NÃO deve haver sobreposição de áudio
4. Verifique os logs:
   - `[Player] Iniciando carregamento: http://...`
   - `[Player] Usando player nativo da Smart TV`
   - `[Player] Stream carregado e pronto`
   - `[Player] Reprodução iniciada`

---

## 🧪 Checklist de Testes na LG webOS

### Teste 1: Navegação com D-Pad
- [ ] Setas direcionais movem o foco (sem cursor aparecendo)
- [ ] Foco visual verde (outline 4px) é claramente visível
- [ ] Tecla OK/ENTER seleciona o item focado
- [ ] Navegação entre categorias e canais funciona

### Teste 2: Tela Cheia e VOLTAR
- [ ] Entrar em tela cheia com OK
- [ ] Pressionar VOLTAR volta para lista (não fecha app)
- [ ] Pode entrar e sair de tela cheia múltiplas vezes
- [ ] OSD aparece por 4.5s e desaparece

### Teste 3: Troca Rápida de Canais
- [ ] Apertar CIMA/BAIXO várias vezes rapidamente
- [ ] NÃO há sobreposição de áudio
- [ ] Loading aparece entre trocas
- [ ] Vídeo sincroniza com áudio

### Teste 4: Filmes e Séries
- [ ] Categorias VOD carregam
- [ ] Filmes aparecem em grade
- [ ] Pode selecionar e assistir filme
- [ ] Séries carregam temporadas e episódios

---

## 📊 Logs Esperados no Console

### Inicialização
```
[Zyveron] Smart TV detectada - User Agent: Mozilla/5.0 (Web0S; ...
[Zyveron] Ativando modo D-Pad com bloqueio de cursor
[Zyveron] Cursor do Magic Remote desativado com sucesso
[Zyveron] Foco inicial aplicado em: BUTTON
```

### Navegação com Controle
```
[Zyveron] Tecla pressionada - Code: 38 Key: ArrowUp Which: 38
[Zyveron] Tecla pressionada - Code: 40 Key: ArrowDown Which: 40
[Zyveron] Tecla pressionada - Code: 13 Key: Enter Which: 13
```

### Troca de Canal
```
[Player] Iniciando carregamento: http://servidor.com/.../123.m3u8
[Player] Usando player nativo da Smart TV
[Player] Iniciando carregamento do stream
[Player] Stream carregado e pronto
[Player] Reprodução iniciada
```

### Voltar de Tela Cheia
```
[Zyveron] Tecla pressionada - Code: 461 Key: Back Which: 461
[Player] Tecla VOLTAR pressionada - voltando para lista
```

---

## 🔍 Troubleshooting

### Se o cursor ainda aparecer:
1. Force refresh: CTRL + F5
2. Limpe cache da TV: Configurações > Geral > Gerenciar Armazenamento
3. Verifique se a classe `.smart-tv` está no `<html>` e `<body>`
4. Verifique no console se a mensagem de detecção apareceu

### Se as setas não funcionarem:
1. Verifique se o foco está em algum elemento (deve ter outline verde)
2. Tente clicar uma vez na tela para ativar o foco
3. Verifique os logs de tecla pressionada
4. Se Code/Key/Which estiverem todos undefined, é problema do webOS

### Se o VOLTAR não funcionar:
1. Verifique o código da tecla nos logs
2. LG webOS geralmente usa code 461
3. Samsung Tizen usa 10009
4. Se nenhum log aparecer, a tecla está sendo capturada pelo sistema

### Se houver áudio sobreposto:
1. Verifique se os logs mostram "Usando player nativo"
2. Se não, a TV pode não estar sendo detectada corretamente
3. Tente forçar o user agent (Developer Mode)

---

## 🚀 Deploy e Atualização

### Build para Produção
```bash
cd smart-tv
pnpm run build
```

### Atualizar na TV (Método Web)
1. Suba a pasta `dist/` para seu servidor
2. Na TV, limpe o cache do navegador
3. Recarregue a página (F5 ou fechar e abrir)

### Verificar Versão Atual
Abra o console da TV e digite:
```javascript
console.log(navigator.userAgent);
```

Deve conter: `Web0S`, `webOS`, ou `SmartTV`

---

## 📝 Notas Técnicas

### Códigos de Tecla LG webOS
```
ArrowUp:    38 / Code: ArrowUp
ArrowDown:  40 / Code: ArrowDown
ArrowLeft:  37 / Code: ArrowLeft
ArrowRight: 39 / Code: ArrowRight
Enter/OK:   13 / Code: Enter
Back:       461 / Code: (varies)
```

### webOSSystem API
```javascript
// Esconder cursor
window.webOSSystem.cursor('hidden');

// Mostrar cursor (debug)
window.webOSSystem.cursor('visible');
```

### Forçar Detecção de Smart TV (Debug)
Adicione temporariamente no console:
```javascript
document.documentElement.classList.add('smart-tv');
document.body.classList.add('smart-tv');
```

---

## ✅ Status das Correções

| Problema | Status | Testado | Logs Implementados |
|----------|--------|---------|-------------------|
| Cursor aparecendo | ✅ Corrigido | ⏳ Aguardando | ✅ Sim |
| VOLTAR não funciona | ✅ Corrigido | ⏳ Aguardando | ✅ Sim |
| Áudio sobreposto | ✅ Corrigido | ⏳ Aguardando | ✅ Sim |

---

**Versão**: 1.0.2  
**Data**: 3 de Novembro de 2026  
**Testado em**: Desktop (dev), LG webOS (pending)
