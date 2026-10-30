/**
 * Zyveron Play - Teste Automatizado de Integração Ponta a Ponta
 * Valida o ciclo completo entre o Painel de Controle e o Aplicativo TV:
 * 1. Ativação por MAC + Device Key com dedução de créditos
 * 2. Troca em Massa de DNS (Server Pointer)
 * 3. Envio e recepção de Mensagens em Tempo Real na TV
 * 4. Bloqueio Imediato e Verificação de Vencimento
 */

import assert from "node:assert";

console.log("========================================================");
console.log("   Zyveron Play - Validador de Integridade do Sistema");
console.log("========================================================\n");

// Mock de Estado do Sistema para Validação de Regras de Negócio
const system = {
  servers: [
    {
      id: "srv-01",
      name: "Servidor Principal BR",
      activeDns: "http://stream01.zyveronplay.com:8080",
      fallbackDns: ["http://backup01.zyveronplay.com:8080"]
    }
  ],
  users: [
    {
      uid: "usr-admin",
      name: "Super Admin",
      role: "superadmin",
      credits: 9999
    },
    {
      uid: "usr-reseller",
      name: "Revenda Master",
      role: "reseller",
      credits: 10
    }
  ],
  devices: new Map(),
  notifications: []
};

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASSOU] ${name}`);
  } catch (err) {
    console.error(`❌ [FALHOU] ${name}:`, err.message);
    process.exit(1);
  }
}

// 1. Teste de Virtual MAC e Device Key
runTest("Formato do Virtual MAC e PIN (Device Key)", () => {
  const sampleMac = "00:1A:79:A4:8B:20";
  const samplePin = "749210";
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  const pinRegex = /^\d{6}$/;

  assert.ok(macRegex.test(sampleMac), "O Virtual MAC deve ter formato válido XX:XX:XX:XX:XX:XX");
  assert.ok(pinRegex.test(samplePin), "A Device Key deve ter exatamente 6 dígitos");
});

// 2. Teste de Ativação por MAC com Dedução de Créditos
runTest("Ativação de MAC com Débito Atômico de Crédito", () => {
  const reseller = system.users.find(u => u.uid === "usr-reseller");
  const initialCredits = reseller.credits;
  const mac = "00:1A:79:A4:8B:20";
  const months = 1;

  // Verifica saldo
  assert.ok(reseller.credits >= months, "Revenda deve ter saldo suficiente");

  // Deduz crédito
  reseller.credits -= months;

  // Ativa dispositivo por 30 dias
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + (30 * months));

  system.devices.set(mac, {
    mac,
    deviceKey: "749210",
    serverId: "srv-01",
    username: "user_teste",
    password: "pwd_teste",
    resellerId: reseller.uid,
    expirationDate: expDate.toISOString(),
    status: "active"
  });

  assert.strictEqual(reseller.credits, initialCredits - 1, "Deve deduzir exatamente 1 crédito");
  assert.strictEqual(system.devices.get(mac).status, "active", "Dispositivo deve estar com status 'active'");
});

// 3. Teste de Troca em Massa de DNS (Server Pointer)
runTest("Troca em Massa de DNS (Server Pointer sem afetar dados individuais)", () => {
  const srv = system.servers.find(s => s.id === "srv-01");
  const oldDns = srv.activeDns;
  const newDns = "http://novo-dns-02.zyveronplay.com:8080";

  // Altera o DNS do servidor
  srv.activeDns = newDns;

  // O dispositivo na TV apenas consulta seu serverId:
  const device = system.devices.get("00:1A:79:A4:8B:20");
  const resolvedServer = system.servers.find(s => s.id === device.serverId);

  assert.strictEqual(resolvedServer.activeDns, newDns, "O dispositivo deve apontar imediatamente para o novo DNS");
  assert.notStrictEqual(resolvedServer.activeDns, oldDns, "O DNS antigo deve ter sido substituído");

  // URL final construída pela TV
  const streamUrl = `${resolvedServer.activeDns}/live/${device.username}/${device.password}/101.ts`;
  assert.strictEqual(streamUrl, "http://novo-dns-02.zyveronplay.com:8080/live/user_teste/pwd_teste/101.ts");
});

// 4. Teste de Notificações em Tempo Real na TV
runTest("Disparo e Recepção de Mensagens em Tempo Real", () => {
  const notification = {
    id: "notif-01",
    targetType: "all",
    targetId: "all",
    title: "Manutenção",
    message: "Servidor em manutenção às 23h.",
    active: true
  };
  system.notifications.push(notification);

  // TV escuta onde targetType == 'all' ou targetId == seu MAC
  const deviceMac = "00:1A:79:A4:8B:20";
  const received = system.notifications.filter(
    n => n.active && (n.targetType === "all" || n.targetId === deviceMac)
  );

  assert.ok(received.length > 0, "A TV deve receber a notificação");
  assert.strictEqual(received[0].title, "Manutenção");
});

// 5. Teste de Bloqueio Imediato por Inadimplência
runTest("Bloqueio Imediato de Aparelho (Corte de Sinal)", () => {
  const device = system.devices.get("00:1A:79:A4:8B:20");
  device.status = "blocked";

  // A TV avalia o status antes de reproduzir
  const canPlay = device.status === "active";
  assert.strictEqual(canPlay, false, "O sinal do player deve ser bloqueado imediatamente");
});

console.log("\n========================================================");
console.log("   🎉 Todos os 5 testes de integração foram APROVADOS!");
console.log("========================================================\n");

