/**
 * Script de Empacotamento do Zyveron Play para Samsung Smart TV (Tizen OS)
 * Gera o arquivo ZyveronPlay.wgt pronto para testes e submissão na Samsung Store.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_WGT = path.join(ROOT_DIR, 'ZyveronPlay.wgt');

console.log('====================================================');
console.log('  ZYVERON PLAY - EMPACOTADOR SAMSUNG SMART TV (.WGT)  ');
console.log('====================================================');

// 1. Verifica se a pasta dist existe
if (!fs.existsSync(DIST_DIR)) {
  console.error('[ERRO] Pasta dist não encontrada! Execute "npm run build" antes de empacotar.');
  process.exit(1);
}

// 2. Garante que config.xml e icon.png estejam na raiz de dist/
const configSource = path.join(ROOT_DIR, 'config.xml');
const configDest = path.join(DIST_DIR, 'config.xml');
if (fs.existsSync(configSource)) {
  fs.copyFileSync(configSource, configDest);
  console.log('✓ config.xml copiado para dist/');
}

const iconSource = path.join(ROOT_DIR, 'icon.png');
const iconDest = path.join(DIST_DIR, 'icon.png');
if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, iconDest);
  console.log('✓ icon.png copiado para dist/');
}

// 3. Remove pacote anterior se existir
if (fs.existsSync(OUTPUT_WGT)) {
  try {
    fs.unlinkSync(OUTPUT_WGT);
    console.log('✓ Pacote anterior removido');
  } catch {}
}

// 4. Compacta o conteúdo de dist/ no formato .wgt (ZIP padrão W3C Widget)
console.log('📦 Empacotando arquivos no formato Tizen Widget (.wgt)...');

let packaged = false;

// Tentativa 1: tar.exe nativo do Windows 10/11 (rápido e não depende de buffers de console)
try {
  execSync(`tar.exe -a -c -f "${OUTPUT_WGT}" -C "${DIST_DIR}" *`, { stdio: 'pipe' });
  if (fs.existsSync(OUTPUT_WGT)) {
    packaged = true;
  }
} catch (tarErr) {
  // Fallback se tar.exe não estiver disponível
}

// Tentativa 2: .NET ZipFile via PowerShell sem Write-Progress
if (!packaged) {
  try {
    const psCmd = `powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; [System.IO.Compression.ZipFile]::CreateFromDirectory('${DIST_DIR}', '${OUTPUT_WGT}')"`;
    execSync(psCmd, { stdio: 'inherit' });
    if (fs.existsSync(OUTPUT_WGT)) {
      packaged = true;
    }
  } catch (psErr) {
    console.error('[ERRO ao empacotar com PowerShell]:', psErr.message);
  }
}

if (packaged && fs.existsSync(OUTPUT_WGT)) {
  const stats = fs.statSync(OUTPUT_WGT);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('====================================================');
  console.log('  ✅ PACOTE GERADO COM SUCESSO!                     ');
  console.log(`  Arquivo: ${OUTPUT_WGT}`);
  console.log(`  Tamanho: ${sizeMb} MB`);
  console.log('====================================================');
  console.log('Próximo passo:');
  console.log('- Para submeter na loja: envie este arquivo no Samsung Seller Office.');
  console.log('- Consulte GUIA_SUBMISSAO_SAMSUNG.md para o passo a passo completo.');
} else {
  console.error('[ERRO] Não foi possível gerar o arquivo ZyveronPlay.wgt');
  process.exit(1);
}
