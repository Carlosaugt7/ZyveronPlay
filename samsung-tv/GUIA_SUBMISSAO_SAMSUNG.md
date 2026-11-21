# 🚀 Guia Oficial de Submissão na Loja Samsung Smart TV (Tizen OS)

Este guia contém o passo a passo completo e detalhado para você criar sua conta de desenvolvedor gratuita na Samsung, emitir os certificados oficiais e enviar o pacote **ZyveronPlay.wgt** para a loja oficial da Samsung (**Samsung Apps TV Seller Office**).

---

## 📌 1. Visão Geral do Aplicativo para a Samsung

* **Nome do Aplicativo:** `Zyveron Play`
* **Package ID:** `zyveronply`
* **Application ID:** `zyveronply.ZyveronPlay`
* **Target OS:** Tizen 4.0 até Tizen 9.0+ (Televisores fabricados de 2018 a 2026+)
* **Categoria Recomendada:** `Video` ou `Entertainment`
* **Classificação Etária:** `12+` ou `Livre` (Player de Mídia Neutro)
* **Formato do Pacote:** `.wgt` (Tizen Web Widget)

---

## 🔑 2. Criação da Conta no Samsung Seller Office

1. Acesse o portal oficial: [Samsung Apps TV Seller Office](https://seller.samsungapps.com).
2. Clique no canto superior direito em **Sign In** (ou **Sign Up** caso ainda não tenha uma Conta Samsung).
3. Faça login com sua conta Samsung (pode usar seu Gmail ou e-mail preferido).
4. No primeiro acesso, o portal solicitará o tipo de cadastro:
   * Escolha **Individual** (Pessoa Física): É imediato, gratuito e não exige CNPJ nem número D-U-N-S.
5. Preencha seus dados de desenvolvedor (Nome, Telefone, País: Brasil) e aceite o contrato de parceria (*Tizen Partner Agreement*).
6. Pronto! O acesso ao dashboard de desenvolvedor da Samsung estará liberado.

---

## 🛠️ 3. Como Gerar o Pacote (.wgt) do Zyveron Play

Dentro da pasta `samsung-tv/`, você tem scripts 100% automatizados para compilar e empacotar:

### Opção 1: Pelo Terminal / VS Code
```bash
cd samsung-tv
npm run build:wgt
```

### Opção 2: Pelo Windows Explorer
Basta dar **duplo clique** no arquivo executável:
`samsung-tv/scripts/build-wgt.bat`

O script fará:
1. Compilação TypeScript e Vite otimizada para Tizen 4.0+ na pasta `dist/`.
2. Inclusão automática do manifesto `config.xml` e do ícone de alta resolução `icon.png`.
3. Geração do arquivo final: **`samsung-tv/ZyveronPlay.wgt`**.

---

## 📝 4. Como Cadastrar o Aplicativo no Samsung Seller Office

1. No painel do [Samsung Seller Office](https://seller.samsungapps.com), clique no menu lateral em **Applications** > **Create New Application**.
2. Selecione a plataforma: **Samsung Smart TV (Tizen)**.
3. Preencha os campos obrigatórios:

### A. Informações Básicas (Basic Information)
* **Application Title:** `Zyveron Play`
* **Default Language:** `Portuguese (Brazil)` (ou English se desejar alcance global).
* **Category:** `Video`
* **Sub-category:** `Media Player` ou `Video Streaming`
* **Description:**
  ```text
  Zyveron Play é um reprodutor de mídia avançado e intuitivo, desenvolvido especialmente para Smart TVs Samsung.
  Com navegação espacial fluida otimizada para o controle remoto, suporte a múltiplas listas pessoais, controle parental e carregamento instantâneo de transmissões ao vivo, filmes e séries on-demand.
  ```

### B. Upload do Pacote do Aplicativo
* Clique no botão **Upload File** e selecione o arquivo **`ZyveronPlay.wgt`** gerado na pasta `samsung-tv/`.
* O sistema da Samsung lerá o manifesto `config.xml` e reconhecerá automaticamente:
  - ID: `zyveronply.ZyveronPlay`
  - Resolução: 1920x1080 (Landscape)
  - Versão: 2.0.0
  - Modelos suportados: Tizen 4.0 em diante.

### C. Imagens e Capturas de Tela (Obrigatórias)
* **App Icon:** Arquivo `samsung-tv/icon.png` (512x512 pixels em formato PNG).
* **Screenshots (Capturas de Tela):** Envie de 4 a 6 capturas de tela no tamanho exato de **1920x1080** pixels (você pode capturar a tela da TV ou do navegador em tela cheia na Home, nos Canais ao Vivo e nos Filmes).

### D. Dados Jurídicos e Contato
* **Privacy Policy URL:** `https://tvplay.loja-am.top/privacy`
* **Terms of Service URL:** `https://tvplay.loja-am.top/terms`
* **Customer Support Email:** seu e-mail de atendimento ao cliente.

### E. Dica de Ouro para Aprovação Imediata no QA da Samsung (Nota de Teste)
No campo **Note for Tester / QA Notes**, coloque instruções claras informando que o app é um reprodutor neutro:
```text
Zyveron Play is a neutral media player for personal content.
Test account for verification:
MAC Address: (insira o MAC de uma conta de teste ativa com validade)
Device Key: (insira a chave correspondente)
All streams and categories are provided for QA validation purposes.
```

---

## ⏱️ 5. Tempo de Revisão e Publicação

* Após clicar em **Submit**, a equipe de QA da Samsung iniciará os testes automáticos e manuais em televisores reais em laboratório.
* O processo leva tipicamente de **3 a 5 dias úteis**.
* Assim que aprovado, o status muda para **Published** e o Zyveron Play fica disponível para busca e download por qualquer usuário de Smart TV Samsung no Brasil e no mundo!
