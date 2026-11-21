# Zyveron Play - Módulo Oficial Samsung Smart TV (Tizen OS)

Módulo dedicado e isolado para compilação e empacotamento do aplicativo nativo Zyveron Play para televisores **Samsung Smart TV (Tizen OS 4.0 ao 9.0+)**.

## 📁 Estrutura de Arquivos
* `config.xml`: Manifesto W3C / Tizen TV oficial (Package ID: `zyveronply`, App ID: `zyveronply.ZyveronPlay`).
* `icon.png`: Ícone oficial de alta definição (512x512 PNG).
* `index.html`: Entrypoint com injeção automática de `$WEBAPIS/webapis/webapis.js`.
* `src/`: Código-fonte React 18 com navegação espacial por controle remoto Samsung.
* `scripts/package-wgt.cjs`: Empacotador automatizado no formato `.wgt`.
* `scripts/build-wgt.bat`: Script de 1 clique para compilar e gerar o pacote no Windows.
* `GUIA_SUBMISSAO_SAMSUNG.md`: Manual passo a passo completo para submissão no Samsung Seller Office.

## 🚀 Como Compilar e Gerar o Pacote .wgt
```bash
# 1. Entre na pasta do módulo
cd samsung-tv

# 2. Compile e gere o arquivo ZyveronPlay.wgt
npm run build:wgt
```
O pacote **`ZyveronPlay.wgt`** será gerado na raiz da pasta `samsung-tv/`, pronto para ser submetido no Samsung Seller Office.
