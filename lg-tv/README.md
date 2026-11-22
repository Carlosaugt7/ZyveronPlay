# Zyveron Play - Módulo Oficial LG Smart TV (webOS)

Módulo dedicado e isolado para compilação e empacotamento do aplicativo nativo Zyveron Play para televisores **LG Smart TV (webOS 4.0 até 24+)**.

## 📁 Estrutura de Arquivos
* `appinfo.json`: Manifesto oficial da LG Content Store (App ID: `com.zyveron.play`).
* `icon.png`: Ícone da listagem de aplicativos (80x80 PNG).
* `largeIcon.png`: Ícone do launcher webOS (130x130 PNG).
* `index.html`: Entrypoint webOS com estilos responsivos de TV.
* `src/`: Código-fonte React 18 com navegação espacial e suporte ao LG Magic Remote.
* `scripts/package-ipk.cjs`: Empacotador automatizado no formato `.ipk`.
* `scripts/build-ipk.bat`: Script de 1 clique para compilar e gerar o pacote no Windows.
* `GUIA_SUBMISSAO_LG.md`: Manual passo a passo completo para submissão no LG Seller Lounge.

## 🚀 Como Compilar e Gerar o Pacote .ipk
```bash
# 1. Entre na pasta do módulo
cd lg-tv

# 2. Compile e gere o arquivo .ipk
npm run build:ipk
```
O pacote **`com.zyveron.play_2.0.0_all.ipk`** será gerado na raiz da pasta `lg-tv/`, pronto para envio ao LG Seller Lounge.
