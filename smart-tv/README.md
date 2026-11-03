# 📺 Zyveron Play - Edição Smart TV (Samsung Tizen, LG webOS & Web TV)

Aplicação Web TV de altíssimo desempenho, ultraleve e responsiva, desenvolvida em **Vite + React + TypeScript + Tailwind CSS** para reprodução fluida de listas IPTV Xtream Codes com suporte primário a **HLS (`.m3u8`)** e aceleração por hardware nativa.

---

## 🚀 Principais Recursos

1. **Aceleração por Hardware de Vídeo (Hls.js / Media Source Extensions):**
   - Transmissões ao vivo em Full HD/4K com zapping ultrarrápido (< 1 segundo).
   - Buffer dinâmico calibrado (10s a 20s) para evitar sobrecarga de memória RAM na TV.
   - Fallback automático para MPEG-TS caso o provedor fique sem chunks HLS.

2. **Virtualização de Lista de Alta Eficiência:**
   - Mantém desenhados na tela apenas os 8 a 12 itens visíveis, fixando o consumo de RAM em ~25MB independentemente de a lista ter 500 ou 50.000 canais.

3. **Navegação Espacial para Controle Remoto (D-Pad):**
   - Mapeamento nativo das teclas físicas: `Cima`, `Baixo`, `Esquerda`, `Direita`, `Enter/OK` e tecla `Voltar/Return` (suporte a Samsung Tizen `10009` e LG webOS `461`).

4. **Ativação por MAC Virtual e Device Key:**
   - Gera um MAC virtual padrão IEEE (`02:XX:XX:XX:XX:XX`) e Device Key de 6 dígitos.
   - Sincroniza em tempo real com o Firebase Firestore (`devices/{mac}`).
   - Opção de **"Restaurar MAC Anterior"** caso o cliente limpe o histórico de navegação.

---

## 🛠️ Como Usar e Hospedar

### 1. Como Web TV no Navegador da Smart TV (Método Recomendado e Mais Rápido)
A pasta `dist/` gerada pelo comando `pnpm run build` é totalmente estática:
1. Suba o conteúdo de `smart-tv/dist` para seu servidor/VPS (ex: em um subdomínio como `tv.zyveronplay.pro` ou apontando um container Nginx/Easypanel).
2. Na Smart TV Samsung ou LG, abra o aplicativo de **Navegador de Internet**.
3. Acesse `http://tv.zyveronplay.pro` e salve nos Favoritos da tela inicial da TV.
4. O cliente verá a tela de ativação com o MAC e a Chave. Basta você ativar o MAC no seu Painel Gestor!

### 2. Empacotando para Samsung Tizen (`.wgt`)
Para gerar o pacote instalável para Samsung Tizen:
```bash
# Com o Tizen Studio CLI instalado:
tizen package -t wgt -s <nome-do-seu-perfil-de-certificado> -- smart-tv/dist
```
O arquivo `.wgt` gerado pode ser enviado para a TV via Tizen Studio ou Pen Drive (modelos compatíveis).

### 3. Empacotando para LG webOS (`.ipk`)
Para gerar o pacote instalável para LG webOS:
```bash
# Com o webOS CLI (ares-cli) instalado:
ares-package smart-tv/dist
```
O arquivo `.ipk` gerado pode ser instalado na TV via `ares-install` ou pelo LG Developer Mode.

---

## 💻 Comandos de Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento local
pnpm run dev

# Gerar compilação estática de produção
pnpm run build
```
