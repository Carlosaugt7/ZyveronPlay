const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../smart-tv/dist');
const destDir = path.join(__dirname, '../ui');

if (!fs.existsSync(srcDir)) {
  console.error(`Erro: Diretório de origem não encontrado: ${srcDir}`);
  console.error('Execute "npm run build" em smart-tv antes de copiar.');
  process.exit(1);
}

// Limpa destino anterior
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

fs.cpSync(srcDir, destDir, { recursive: true });
console.log(`UI copiada com sucesso de smart-tv/dist para desktop/ui`);

