# 📺 INSTRUÇÕES PARA TESTAR NA TV LG webOS

## 🚀 Como Atualizar o App na TV

### Método 1: Recarregar a Página (Mais Rápido)
1. Na TV LG, abra o navegador de internet
2. Acesse a URL do app (ex: `http://tv.zyveronplay.pro` ou `http://tvplay.loja-am.top`)
3. Pressione o botão **Menu/Options** do controle
4. Selecione **Recarregar** ou **Atualizar Página**
5. Aguarde o carregamento completo

### Método 2: Limpar Cache (Recomendado se houver problemas)
1. Vá em **Configurações** da TV
2. Entre em **Geral** > **Sobre Esta TV** > **Informações do Navegador**
3. Selecione **Limpar Cache** e **Limpar Cookies**
4. Confirme
5. Abra o navegador novamente e acesse o app

---

## ✅ TESTE 1: Navegação com Controle (D-Pad)

### O que testar:
1. **Abra o app na TV**
2. **NÃO deve aparecer cursor/seta do mouse na tela**
3. Use as **setas do controle** para navegar:
   - **⬆ CIMA**: Move para o item acima
   - **⬇ BAIXO**: Move para o item abaixo
   - **⬅ ESQUERDA**: Move para coluna da esquerda
   - **➡ DIREITA**: Move para coluna da direita
   - **OK/ENTER**: Seleciona o item focado

### ✅ Resultado Esperado:
- ✅ **Nenhum cursor aparece** na tela
- ✅ Item focado tem **borda verde brilhante** (outline)
- ✅ Navegação flui suavemente entre menus
- ✅ Feedback visual claro do que está selecionado

### ❌ Se não funcionar:
- Recarregue a página com F5
- Limpe o cache da TV
- Tente clicar uma vez na tela para ativar o foco
- Me avise com print/foto da tela

---

## ✅ TESTE 2: Tecla VOLTAR em Tela Cheia

### O que testar:
1. Entre na seção **TV ao Vivo**
2. Selecione qualquer canal
3. Pressione **OK** para entrar em **tela cheia**
4. O vídeo deve ocupar a tela inteira
5. Pressione a tecla **⬅ VOLTAR** (RETURN/BACK) do controle
6. **Não deve fechar o app!**

### ✅ Resultado Esperado:
- ✅ Ao pressionar VOLTAR, **volta para a lista de canais**
- ✅ App **continua aberto**
- ✅ Pode entrar e sair de tela cheia **várias vezes**
- ✅ Navegação continua funcionando normalmente

### ❌ Se não funcionar:
- Verifique se está pressionando a tecla VOLTAR correta
- Tente pressionar ESC no teclado (se tiver)
- Me avise com detalhes do que acontece

---

## ✅ TESTE 3: Trocar de Canal Rapidamente

### O que testar:
1. Entre em **TV ao Vivo** e selecione um canal
2. Entre em **tela cheia** (OK)
3. Pressione **⬆ CIMA** ou **⬇ BAIXO** para trocar de canal
4. **Troque RÁPIDO várias vezes** (5-6 vezes seguidas)
5. Observe se há problemas de áudio

### ✅ Resultado Esperado:
- ✅ **NÃO deve haver sobreposição de áudio** (dois áudios ao mesmo tempo)
- ✅ Aparece um indicador de "Carregando..." ao trocar
- ✅ Vídeo carrega e sincroniza com o áudio corretamente
- ✅ Transição suave entre canais

### ❌ Se houver áudio sobreposto:
- Me avise imediatamente
- Tente trocar de canal mais devagar
- Verifique se o problema persiste

---

## ✅ TESTE 4: Filmes e Séries (VOD)

### O que testar:
1. Entre na seção **Filmes**
2. Verifique se as **categorias aparecem** na esquerda
3. Selecione uma categoria
4. Verifique se os **filmes aparecem em grade**
5. Selecione um filme e pressione OK
6. Repita para a seção **Séries**

### ✅ Resultado Esperado:
- ✅ Categorias carregam corretamente
- ✅ Filmes/Séries aparecem com capas
- ✅ Pode navegar pela grade
- ✅ Pode assistir o conteúdo

### ❌ Se não carregar:
- Aguarde 10-15 segundos (pode ser lentidão da rede)
- Volte para o menu principal e entre novamente
- Me avise se permanecer vazio

---

## 📋 CHECKLIST COMPLETO

Marque ✅ se funcionou ou ❌ se não funcionou:

### Navegação
- [ ] Cursor NÃO aparece na tela
- [ ] Setas do controle funcionam
- [ ] Foco visual (borda verde) é visível
- [ ] OK/ENTER seleciona itens

### Tela Cheia
- [ ] VOLTAR não fecha o app
- [ ] Volta para lista de canais
- [ ] Pode entrar/sair múltiplas vezes

### Troca de Canal
- [ ] NÃO há áudio sobreposto
- [ ] Transição é suave
- [ ] Loading aparece ao trocar

### Conteúdo
- [ ] TV ao Vivo carrega
- [ ] Filmes (VOD) carregam
- [ ] Séries carregam
- [ ] Pode assistir tudo

---

## 🐛 Como Reportar Problemas

Se algum teste falhar, me envie:

1. **Qual teste falhou?** (Navegação, Tela Cheia, etc.)
2. **O que aconteceu?** (Descreva o comportamento)
3. **Foto/Print da tela** (se possível)
4. **Modelo da TV LG** (ex: LG 55UN7310PSC)
5. **Ano da TV** (aproximadamente)

---

## 💡 Dicas Importantes

- **Primeiro teste**: Foque em verificar se o cursor sumiu
- **Internet**: Certifique-se de que a TV está com boa conexão
- **Paciência**: Alguns streams podem demorar 2-3s para carregar
- **Múltiplos testes**: Teste cada item várias vezes para confirmar

---

## 🎯 PRIORIDADE DOS TESTES

### Teste IMEDIATAMENTE:
1. ✅ **TESTE 1** - Cursor e navegação (CRÍTICO)

### Depois teste:
2. ✅ **TESTE 2** - Tecla VOLTAR
3. ✅ **TESTE 3** - Áudio sobreposto

### Se sobrar tempo:
4. ✅ **TESTE 4** - Filmes e Séries

---

**Versão do App**: 1.0.2  
**Data da Atualização**: 3 de Novembro de 2026  
**Status**: ✅ Deploy concluído - Aguardando testes na TV real
