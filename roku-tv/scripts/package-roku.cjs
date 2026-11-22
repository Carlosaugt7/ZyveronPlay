/**
 * Script de Empacotamento do Zyveron Play para Roku TV (Roku OS)
 * Gera o arquivo ZyveronPlay_Roku_2.0.0.zip pronto para Developer Sideload e submissão na Roku Channel Store.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROKU_DIR = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.join(ROKU_DIR, 'ZyveronPlay_Roku_2.0.0.zip');

console.log('====================================================');
console.log('    ZYVERON PLAY - EMPACOTADOR ROKU TV (ROKU OS)    ');
console.log('====================================================');

// 1. Valida arquivos obrigatórios do Roku OS
const manifestPath = path.join(ROKU_DIR, 'manifest');
const mainBrsPath = path.join(ROKU_DIR, 'source', 'main.brs');
const mainScenePath = path.join(ROKU_DIR, 'components', 'MainScene.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('[ERRO] Arquivo "manifest" não encontrado em:', manifestPath);
  process.exit(1);
}
if (!fs.existsSync(mainBrsPath)) {
  console.error('[ERRO] Arquivo "source/main.brs" não encontrado em:', mainBrsPath);
  process.exit(1);
}
if (!fs.existsSync(mainScenePath)) {
  console.error('[ERRO] Arquivo "components/MainScene.xml" não encontrado em:', mainScenePath);
  process.exit(1);
}

// 2. Remove pacote anterior se existir
if (fs.existsSync(OUTPUT_ZIP)) {
  try {
    fs.unlinkSync(OUTPUT_ZIP);
    console.log('✓ Pacote anterior removido');
  } catch (err) {
    console.warn('Aviso ao remover pacote anterior:', err.message);
  }
}

// 3. Compacta manifest, source, components e images na raiz do ZIP
console.log('📦 Empacotando arquivos no formato Roku Channel Package (.zip)...');

let packaged = false;

// Tentativa 1: tar.exe nativo do Windows 10/11
try {
  execSync(
    `tar.exe -a -c -f "${OUTPUT_ZIP}" -C "${ROKU_DIR}" manifest source components images`,
    { stdio: 'pipe' }
  );
  if (fs.existsSync(OUTPUT_ZIP)) {
    packaged = true;
  }
} catch (tarErr) {
  // Fallback
}

// Tentativa 2: PowerShell Compress-Archive
if (!packaged) {
  try {
    const psCmd = `Compress-Archive -Path '${path.join(ROKU_DIR, 'manifest')}','${path.join(ROKU_DIR, 'source')}','${path.join(ROKU_DIR, 'components')}','${path.join(ROKU_DIR, 'images')}' -DestinationPath '${OUTPUT_ZIP}' -Force`;
    execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, { stdio: 'pipe' });
    if (fs.existsSync(OUTPUT_ZIP)) {
      packaged = true;
    }
  } catch (psErr) {
    console.error('[ERRO] Falha ao empacotar via PowerShell:', psErr.message);
  }
}

if (!packaged || !fs.existsSync(OUTPUT_ZIP)) {
  console.error('[ERRO FATAL] Não foi possível gerar o arquivo ZIP do Roku!');
  process.exit(1);
}

const stats = fs.statSync(OUTPUT_ZIP);
const sizeKb = (stats.size / 1024).toFixed(2);

console.log('====================================================');
console.log('  ✅ PACOTE ROKU GERADO COM SUCESSO!                ');
console.log('  Arquivo: ' + OUTPUT_ZIP);
console.log('  Tamanho: ' + sizeKb + ' KB');
console.log('====================================================');
console.log('Próximos passos:');
console.log('1. Para testar em sua Roku TV:');
console.log('   - Ative o Modo Desenvolvedor na TV');
console.log('   - Acesse http://<ip-da-tv> no navegador e faça o upload deste .zip');
console.log('2. Para submeter na Roku Channel Store:');
console.log('   - Acesse developer.roku.com -> Manage Channels -> Add Channel');
console.log('   - Envie o arquivo ZyveronPlay_Roku_2.0.0.zip');
console.log('Consulte GUIA_SUBMISSAO_ROKU.md para instruções detalhadas.');
