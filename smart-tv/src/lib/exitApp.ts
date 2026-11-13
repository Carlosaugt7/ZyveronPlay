/**
 * Utilitário Unificado para Encerramento Seguro da Aplicação Smart TV
 * Suporta Media Station X (MSX), Samsung Tizen, LG webOS, Android TV e Desktop
 */
export function executeExitApp(): void {
  console.log('[ExitApp] Solicitando saída da aplicação...');

  // 1. Media Station X (MSX)
  try {
    if (typeof window !== 'undefined') {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify({ action: 'leave' }), '*');
        window.parent.postMessage(JSON.stringify({ action: 'exit' }), '*');
        window.parent.postMessage('msx:leave', '*');
        window.parent.postMessage('msx:exit', '*');
        window.parent.postMessage('leave', '*');
        window.parent.postMessage('exit', '*');
      }
      const tvx = (window as any).TVXInteractionPlugin || (window as any).TVXInteraction || (window as any).TVXServices;
      if (typeof tvx?.execute === 'function') {
        tvx.execute('leave');
      }
      if (typeof tvx?.exit === 'function') {
        tvx.exit();
      }
    }
  } catch (err) {
    console.warn('[ExitApp] Erro na saída Media Station X:', err);
  }

  // 2. Samsung Smart TV (Tizen)
  try {
    const tizen = (window as any).tizen;
    if (tizen?.application) {
      tizen.application.getCurrentApplication().exit();
      return;
    }
  } catch {}

  // 3. LG Smart TV (webOS)
  try {
    const webOS = (window as any).webOS;
    if (typeof webOS?.platformBack === 'function') {
      webOS.platformBack();
    }
  } catch {}

  // 4. Android TV / Cordova / Capacitor
  try {
    const nav = navigator as any;
    if (nav.app && typeof nav.app.exitApp === 'function') {
      nav.app.exitApp();
      return;
    }
    const androidObj = (window as any).Android || (window as any).android;
    if (typeof androidObj?.closeApp === 'function') {
      androidObj.closeApp();
      return;
    }
  } catch {}

  // 5. Electron Desktop
  try {
    if ((window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
      return;
    }
  } catch {}

  // 6. Fechamento padrão de janela web
  try {
    window.close();
  } catch {}
}

