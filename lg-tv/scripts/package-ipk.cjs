/**
 * Script de Empacotamento do Zyveron Play para LG Smart TV (webOS)
 * Gera o arquivo com.zyveron.play_2.0.0_all.ipk homologado para a LG Content Store.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const APP_ID = 'com.zyveron.play';
const APP_VERSION = '2.0.0';
const OUTPUT_IPK = path.join(ROOT_DIR, `${APP_ID}_${APP_VERSION}_all.ipk`);

console.log('====================================================');
console.log('    ZYVERON PLAY - EMPACOTADOR LG SMART TV (.IPK)   ');
console.log('====================================================');

// 1. Verifica se a pasta dist existe
if (!fs.existsSync(DIST_DIR)) {
  console.error('[ERRO] Pasta dist não encontrada! Execute "npm run build" antes de empacotar.');
  process.exit(1);
}

// 2. Garante que appinfo.json e icon.png estejam na raiz de dist/
const appinfoSource = path.join(ROOT_DIR, 'appinfo.json');
const appinfoDest = path.join(DIST_DIR, 'appinfo.json');
if (fs.existsSync(appinfoSource)) {
  fs.copyFileSync(appinfoSource, appinfoDest);
  console.log('✓ appinfo.json copiado para dist/');
}

const iconSource = path.join(ROOT_DIR, 'icon.png');
const iconDest = path.join(DIST_DIR, 'icon.png');
if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, iconDest);
  console.log('✓ icon.png copiado para dist/');
}

const largeIconSource = path.join(ROOT_DIR, 'largeIcon.png');
const largeIconDest = path.join(DIST_DIR, 'largeIcon.png');
if (fs.existsSync(largeIconSource)) {
  fs.copyFileSync(largeIconSource, largeIconDest);
  console.log('✓ largeIcon.png copiado para dist/');
}

// 3. Remove pacote anterior se existir
if (fs.existsSync(OUTPUT_IPK)) {
  try {
    fs.unlinkSync(OUTPUT_IPK);
    console.log('✓ Pacote .ipk anterior removido');
  } catch {}
}

console.log('📦 Empacotando arquivos no formato LG webOS Package (.ipk)...');

// Tentativa 1: Verifica se a CLI oficial da LG (ares-package) está disponível
let builtWithAres = false;
try {
  const checkAres = execSync('ares-package --version', { stdio: 'pipe' }).toString();
  if (checkAres) {
    console.log('✓ Ferramenta oficial LG ares-package detectada! Gerando com ares-package...');
    execSync(`ares-package "${DIST_DIR}" -o "${ROOT_DIR}"`, { stdio: 'inherit' });
    if (fs.existsSync(OUTPUT_IPK)) {
      builtWithAres = true;
    }
  }
} catch {
  // ares-package não instalado globalmente, utiliza empacotador nativo padrão webOS
}

if (!builtWithAres) {
  // Tentativa 2: Empacotador Nativo Debian/webOS (AR Archive)
  try {
    const tempDir = path.join(ROOT_DIR, '.tmp_ipk_build');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // A. Cria debian-binary
    const debianBinaryPath = path.join(tempDir, 'debian-binary');
    fs.writeFileSync(debianBinaryPath, '2.0\n');

    // B. Cria control.tar.gz
    const controlDir = path.join(tempDir, 'control_dir');
    fs.mkdirSync(controlDir, { recursive: true });
    const controlContent = [
      `Package: ${APP_ID}`,
      `Version: ${APP_VERSION}`,
      'Section: misc',
      'Priority: optional',
      'Architecture: all',
      'Maintainer: Zyveron Play Team <suporte@zyveron.play>',
      'Description: Zyveron Play - Reprodutor de Midia Oficial para LG Smart TV',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(controlDir, 'control'), controlContent);

    const controlTarPath = path.join(tempDir, 'control.tar.gz');
    execSync(`tar.exe -czf "${controlTarPath}" -C "${controlDir}" control`, { stdio: 'pipe' });

    // C. Cria data.tar.gz com caminho oficial do webOS (usr/palm/applications/<appId>)
    const dataDir = path.join(tempDir, 'data_dir');
    const appTargetDir = path.join(dataDir, 'usr', 'palm', 'applications', APP_ID);
    fs.mkdirSync(appTargetDir, { recursive: true });

    // Copia todos os arquivos de dist para o diretório alvo da aplicação
    execSync(`powershell -NoProfile -Command "Copy-Item -Recurse -Force '${DIST_DIR}\\*' '${appTargetDir}\\'"`, { stdio: 'pipe' });

    const dataTarPath = path.join(tempDir, 'data.tar.gz');
    execSync(`tar.exe -czf "${dataTarPath}" -C "${dataDir}" usr`, { stdio: 'pipe' });

    // D. Cria o arquivo AR (.ipk)
    function createArHeader(name, size) {
      const header = Buffer.alloc(60, 0x20); // 60 bytes preenchidos com espaço
      const namePadded = (name + '/').padEnd(16, ' ');
      header.write(namePadded, 0, 16, 'ascii');
      header.write('1700000000  ', 16, 12, 'ascii'); // timestamp
      header.write('0     ', 28, 6, 'ascii'); // uid
      header.write('0     ', 34, 6, 'ascii'); // gid
      header.write('100644  ', 40, 8, 'ascii'); // mode
      header.write(String(size).padEnd(10, ' '), 48, 10, 'ascii'); // size
      header.write('`\n', 58, 2, 'ascii'); // magic trailer
      return header;
    }

    const arMagic = Buffer.from('!<arch>\n', 'ascii');
    const debianBinBuf = fs.readFileSync(debianBinaryPath);
    const controlTarBuf = fs.readFileSync(controlTarPath);
    const dataTarBuf = fs.readFileSync(dataTarPath);

    const fd = fs.openSync(OUTPUT_IPK, 'w');
    fs.writeSync(fd, arMagic);

    // debian-binary
    fs.writeSync(fd, createArHeader('debian-binary', debianBinBuf.length));
    fs.writeSync(fd, debianBinBuf);
    if (debianBinBuf.length % 2 !== 0) fs.writeSync(fd, Buffer.from('\n', 'ascii'));

    // control.tar.gz
    fs.writeSync(fd, createArHeader('control.tar.gz', controlTarBuf.length));
    fs.writeSync(fd, controlTarBuf);
    if (controlTarBuf.length % 2 !== 0) fs.writeSync(fd, Buffer.from('\n', 'ascii'));

    // data.tar.gz
    fs.writeSync(fd, createArHeader('data.tar.gz', dataTarBuf.length));
    fs.writeSync(fd, dataTarBuf);
    if (dataTarBuf.length % 2 !== 0) fs.writeSync(fd, Buffer.from('\n', 'ascii'));

    fs.closeSync(fd);

    // Limpa pasta temporária
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (nativeErr) {
    console.error('[ERRO ao empacotar .ipk]:', nativeErr.message);
    process.exit(1);
  }
}

if (fs.existsSync(OUTPUT_IPK)) {
  const stats = fs.statSync(OUTPUT_IPK);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('====================================================');
  console.log('  ✅ PACOTE LG GERADO COM SUCESSO!                  ');
  console.log(`  Arquivo: ${OUTPUT_IPK}`);
  console.log(`  Tamanho: ${sizeMb} MB`);
  console.log('====================================================');
  console.log('Próximo passo:');
  console.log('- Para submeter na loja: envie este arquivo no LG Seller Lounge.');
  console.log('- Consulte GUIA_SUBMISSAO_LG.md para o passo a passo completo.');
} else {
  console.error('[ERRO] Não foi possível gerar o arquivo .ipk');
  process.exit(1);
}
