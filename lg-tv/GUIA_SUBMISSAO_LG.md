# 🚀 Guia Oficial de Submissão na Loja LG Smart TV (webOS)

Este guia contém o passo a passo completo e detalhado para você criar sua conta de desenvolvedor gratuita na LG, cadastrar o aplicativo e enviar o pacote **`com.zyveron.play_2.0.0_all.ipk`** para a loja oficial da LG (**LG Content Store / LG Seller Lounge**).

---

## 📌 1. Visão Geral do Aplicativo para a LG

* **Nome do Aplicativo:** `Zyveron Play`
* **App ID:** `com.zyveron.play`
* **Versão:** `2.0.0`
* **Target OS:** LG webOS 4.0 até webOS 24+ (Televisores fabricados de 2018 a 2026+)
* **Categoria Recomendada:** `Entertainment` ou `Life`
* **Classificação Etária:** `12+` ou `Livre` (Reprodutor de Mídia Neutro)
* **Formato do Pacote:** `.ipk` (LG webOS Application Package)

---

## 🔑 2. Criação da Conta no LG Seller Lounge

1. Acesse o portal oficial de desenvolvedores da LG: [LG Seller Lounge](https://seller.lgappstv.com).
2. Clique no canto superior direito em **Sign In** > **Create an Account**.
3. Escolha o tipo de conta:
   * **Individual (Pessoa Física):** Cadastro gratuito, rápido e não exige CNPJ nem documentação societária complexa.
4. Preencha seus dados cadastrais (Nome, E-mail, País: Brasil) e defina sua senha.
5. Confirme o e-mail de ativação enviado pela LG.
6. Pronto! Sua conta no **LG Seller Lounge** estará ativa e pronta para submeter aplicativos.

---

## 🛠️ 3. Como Gerar o Pacote (.ipk) do Zyveron Play

Dentro da pasta `lg-tv/`, você tem scripts 100% automatizados para compilar e empacotar:

### Opção 1: Pelo Terminal / VS Code
```bash
cd lg-tv
npm run build:ipk
```

### Opção 2: Pelo Windows Explorer
Basta dar **duplo clique** no arquivo executável:
`lg-tv/scripts/build-ipk.bat`

O script fará:
1. Compilação TypeScript e Vite otimizada para webOS 4.0+ na pasta `dist/`.
2. Inclusão automática do manifesto `appinfo.json`, do ícone `icon.png` e do `largeIcon.png`.
3. Geração do arquivo final: **`lg-tv/com.zyveron.play_2.0.0_all.ipk`**.

---

## 📝 4. Como Cadastrar o Aplicativo no LG Seller Lounge

1. No painel do [LG Seller Lounge](https://seller.lgappstv.com), acesse o menu **App Management** > **Add New App**.
2. Selecione a plataforma: **webOS TV**.
3. Preencha os campos obrigatórios:

### A. Informações Básicas (General Info)
* **App Title:** `Zyveron Play`
* **Default Language:** `Portuguese (Brazil)`
* **App Type:** `Hosted/Packaged Web App`
* **Category:** `Entertainment`
* **Service Country:** Selecione `Brazil` (e outros países da América Latina caso deseje).
* **Price:** `Free` (Gratuito).

### B. Upload do Pacote do Aplicativo
* Na seção **App Package**, clique em **Upload** e selecione o arquivo gerado:
  `com.zyveron.play_2.0.0_all.ipk` (localizado dentro da pasta `lg-tv/`).
* A LG verificará a integridade do pacote e confirmará o App ID `com.zyveron.play` e a versão `2.0.0`.

### C. Imagens e Ícones Exigidos pela LG
* **App Icon:** Arquivo `lg-tv/icon.png` (80x80 pixels).
* **Large Icon:** Arquivo `lg-tv/largeIcon.png` (130x130 pixels).
* **Screenshots (Capturas de Tela):** Envie pelo menos 4 capturas de tela em alta definição (**1920x1080** pixels) mostrando a Home, a Grade de Canais, o Catálogo de Filmes e o Player.

### D. Descrição do Aplicativo
```text
Zyveron Play é um reprodutor multimídia moderno, elegante e de alta performance, desenvolvido especificamente para Smart TVs LG webOS.
Conta com navegação fluida por controle remoto convencional e LG Magic Remote, controle dos pais, suporte a múltiplas listas pessoais e carregamento instantâneo de canais ao vivo, filmes e séries.
```

### E. Dados de Contato e Políticas
* **Support Email:** Seu e-mail de suporte ao cliente.
* **Privacy Policy URL:** `https://tvplay.loja-am.top/privacy`

### F. Dica de Aprovação Imediata no Teste de QA da LG
No campo de **Testing Instructions / Notes for Reviewer**, adicione instruções informando que o app é um player neutro:
```text
Zyveron Play is a neutral media player for user-provided playlists.
Test credentials for QA team:
MAC Address: (insira um MAC ativo de teste do seu painel)
Device Key: (insira a chave do aparelho)
No piracy or pre-loaded copyrighted streams are embedded in the app.
```

---

## ⏱️ 5. Tempo de Homologação e Publicação

* Após clicar em **Submit**, a equipe técnica da LG testará o aplicativo em televisores reais (LG OLED, NanoCell e UHD) em laboratório.
* O processo de homologação leva geralmente de **3 a 7 dias úteis**.
* Uma vez homologado, o Zyveron Play entra diretamente na **LG Content Store** e fica acessível para instalação em qualquer TV LG com webOS no Brasil!
