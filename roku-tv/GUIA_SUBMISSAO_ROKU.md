# Guia Completo de Testes e Submissão — Roku TV (Roku OS)

Este manual explica como testar o aplicativo **Zyveron Play** diretamente na sua Roku TV ou aparelho Roku (Roku Express / Streaming Stick) e como publicá-lo na **Roku Channel Store**.

---

## 1. Como Criar Conta no Roku Developer (Gratuita)

1. Acesse o portal oficial de desenvolvedores da Roku: [developer.roku.com](https://developer.roku.com).
2. Clique em **"Sign in"** e em seguida em **"Create account"** (ou faça login com sua conta Roku existente).
3. Preencha seus dados de contato:
   - **Account Type:** Selecione `Individual` (Pessoa Física) ou `Company` (Empresa).
   - Aceite os termos do **Roku Developer Agreement**.
4. A conta de desenvolvedor da Roku é **100% gratuita** (não há taxas anuais como na Apple ou taxa única como no Google).

---

## 2. Como Testar Imediatamente na sua TV (Developer Mode / Sideload)

Qualquer TV ou aparelho Roku pode rodar seu aplicativo diretamente da sua rede Wi-Fi local sem precisar esperar aprovação da loja.

### Passo 1: Habilitar o Modo Desenvolvedor na TV
1. Ligue a sua Roku TV e certifique-se de que ela e o seu computador estejam conectados na **mesma rede Wi-Fi**.
2. No controle remoto da Roku, pressione a seguinte sequência de botões com ritmo constante:
   ```
   [HOME] 3 vezes
   [SETA PARA CIMA] 2 vezes
   [SETA PARA DIREITA] 1 vez
   [SETA PARA ESQUERDA] 1 vez
   [SETA PARA DIREITA] 1 vez
   [SETA PARA ESQUERDA] 1 vez
   [SETA PARA DIREITA] 1 vez
   ```
3. A tela secreta **"Developer Settings"** será exibida.
4. Anote a **URL/IP** que aparece na tela (ex: `http://192.168.1.105`) e o nome de usuário (padrão: `rokudev`).
5. Selecione **"Enable installer and restart"** e defina uma senha de desenvolvedor fácil de lembrar (ex: `123456`). A TV reiniciará automaticamente.

### Passo 2: Instalar o Aplicativo na TV pelo Computador
1. No navegador do seu computador, acesse o IP da sua TV (ex: `http://192.168.1.105`).
2. Digite o usuário `rokudev` e a senha que você configurou.
3. No painel **Application Installer**:
   - Clique em **"Upload"** e selecione o arquivo:
     `roku-tv/ZyveronPlay_Roku_2.0.0.zip`
   - Clique no botão **"Install"**.
4. O **Zyveron Play** abrirá instantaneamente na tela da sua TV!

---

## 3. Como Submeter na Roku Channel Store (Loja Oficial)

### Passo 1: Acessar o Gerenciador de Canais
1. Acesse [developer.roku.com/developer](https://developer.roku.com/developer).
2. No menu principal, clique em **"Dashboard"** e selecione **"Manage My Channels"**.
3. Clique em **"Add Channel"**.

### Passo 2: Tipo de Canal
Você terá duas opções recomendadas:
- **Public Channel (Canal Público Oficial):** Ficará visível para qualquer usuário na busca da Roku Channel Store após aprovação da Roku.
- **Beta / Non-certified Channel:** Fica ativo imediatamente e pode ser instalado por você e seus clientes através de um código de canal personalizado (ex: `ZYVERONPLAY`) ou link direto. *(Excelente para distribuição controlada aos seus clientes)*.

### Passo 3: Propriedades do Canal (Channel Properties)
- **Channel Name:** `Zyveron Play`
- **Supported Languages:** `Portuguese` (e English se desejar)
- **Classification:** `Public` (ou Private/Beta)
- **Requires Internet Connection:** `Yes`
- **Internet Speed Requirements:** `At least 5 Mbps recommended`

### Passo 4: Envio do Pacote (Package Upload)
1. No menu lateral, clique em **"Package Upload"**.
2. Faça o upload do arquivo:
   `roku-tv/ZyveronPlay_Roku_2.0.0.zip`
3. O portal validará automaticamente o `manifest`, os nós SceneGraph e a versão do canal.

### Passo 5: Imagens e Metadados
- **Channel Poster / Icon:** Envie as imagens contidas na pasta `roku-tv/images/`:
  - HD Poster (290x218): `images/mm_icon_focus_hd.png`
  - FHD Poster (540x405): `images/mm_icon_focus_fhd.png`
  - Splash Screen: `images/splash_screen_fhd.png`
- **Description:**
  > "Aplicativo completo de mídia para acesso a canais ao vivo, filmes e séries através de sua lista personalizada."
- **Category:** `Movies & TV` ou `Special Interest`.

### Passo 6: Submissão para Análise (Certification)
1. Revise os dados e clique em **"Submit for Certification"**.
2. O time de engenharia da Roku analisa canais públicos em média de 3 a 7 dias úteis.

---

## 4. Reempacotamento de Novas Versões

Sempre que fizer alterações no código do canal, execute com 1 clique:
- **Windows:** Dê duplo clique em `scripts/build-roku.bat`
- O arquivo `ZyveronPlay_Roku_2.0.0.zip` será atualizado automaticamente.
