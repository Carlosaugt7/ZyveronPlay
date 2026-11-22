import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Tv, Lock, EyeOff, Server, FileText } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade - Zyveron Play",
  description: "Política de Privacidade oficial do reprodutor de mídia Zyveron Play para Smart TVs e dispositivos Android.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "22 de Novembro de 2026";

  return (
    <div className="min-h-screen bg-[#070b10] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Zyveron <span className="text-cyan-400">Play</span>
              </h1>
              <p className="text-xs text-zinc-400">Reprodutor Multimídia & Media Player</p>
            </div>
          </div>
          <Link
            href="/terms"
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            Ver Termos de Uso
          </Link>
        </div>

        {/* Content Card */}
        <div className="bg-[#0c121a] border border-zinc-800/80 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-3 border border-cyan-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Conformidade Global (LGPD / GDPR / Google Play)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Política de Privacidade
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Última atualização: {lastUpdated}</p>
          </div>

          <div className="prose prose-invert prose-cyan max-w-none space-y-6 text-sm text-zinc-300 leading-relaxed">
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                1. Visão Geral e Natureza do Aplicativo
              </h3>
              <p>
                A sua privacidade é uma prioridade fundamental para o <strong>Zyveron Play</strong>. Esta Política de Privacidade descreve de forma clara e transparente quais informações são tratadas quando você utiliza nosso software em Smart TVs (Samsung Tizen, LG webOS, Roku OS), dispositivos Android (Android TV, Google TV, Smartphones) e demais plataformas compatíveis.
              </p>
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 text-xs leading-normal">
                <strong>Declaração Importante:</strong> O <strong>Zyveron Play</strong> é estritamente uma aplicação de reprodução de mídia (Media Player). O aplicativo <strong>NÃO</strong> hospeda, armazena, transmite ou fornece quaisquer listas de canais, filmes, séries ou transmissões multimídia pré-carregadas. Todo e qualquer conteúdo reproduzido é de exclusiva responsabilidade e proveniência do próprio usuário.
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                2. Informações que Coletamos
              </h3>
              <p>
                Para assegurar o funcionamento das configurações personalizadas do reprodutor e a validação do status do dispositivo, podemos tratar estritamente os seguintes dados técnicos mínimos:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                <li>
                  <strong>Identificador Técnico do Aparelho:</strong> Endereço MAC ou identificador único gerado pelo sistema operacional (ex: Roku Channel Client ID / Android Device ID) utilizado unicamente para identificar o dispositivo e sincronizar as configurações da lista inserida.
                </li>
                <li>
                  <strong>Configurações do Reprodutor:</strong> Preferências de reprodução salvas localmente no dispositivo (formato de proporção de tela, decodificador de áudio/vídeo, idioma de legendas e PIN de bloqueio parental).
                </li>
                <li>
                  <strong>Dados Técnicos de Diagnóstico:</strong> Relatórios anônimos de falhas (crash logs) e métricas de desempenho para correção de eventuais erros de travamento em modelos específicos de Smart TV.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                3. Informações que NÃO Coletamos
              </h3>
              <p>
                Em conformidade rigorosa com as diretrizes de privacidade das lojas de aplicativos:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                <li><strong>NÃO</strong> coletamos dados pessoais sensíveis, documentos (CPF, RG), fotos ou dados bancários.</li>
                <li><strong>NÃO</strong> rastreamos nem armazenamos o histórico individual de conteúdos assistidos em servidores externos.</li>
                <li><strong>NÃO</strong> temos acesso à geolocalização exata por GPS do usuário.</li>
                <li><strong>NÃO</strong> vendemos, alugamos ou comercializamos quaisquer dados de usuários com empresas de publicidade ou corretores de dados.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                4. Finalidade do Tratamento de Dados
              </h3>
              <p>Os dados técnicos coletados possuem as seguintes finalidades exclusivas:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                <li>Permitir a sincronização do reprodutor através do identificador do dispositivo.</li>
                <li>Manter ativas as preferências de áudio, legendas e categorias favoritas do usuário.</li>
                <li>Garantir a estabilidade e a compatibilidade do aplicativo com as constantes atualizações de firmware das Smart TVs.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                5. Segurança da Informação
              </h3>
              <p>
                Adotamos padrões modernos de segurança técnica e organizacional, incluindo criptografia SSL/TLS em todas as comunicações de rede entre o aplicativo e a infraestrutura de sincronização (Google Cloud Firestore), garantindo proteção contra acessos não autorizados e interceptações maliciosas.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                6. Direitos do Usuário (LGPD e GDPR)
              </h3>
              <p>
                O usuário possui o direito de solicitar a qualquer momento a confirmação da existência de tratamento, a correção de dados incompletos ou a desvinculação completa do identificador do seu dispositivo de nossa base de dados.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                7. Contato e Suporte
              </h3>
              <p>
                Para dúvidas, esclarecimentos sobre esta Política de Privacidade ou solicitações de titulares de dados, entre em contato através de nosso canal oficial de atendimento ou pelo suporte técnico disponibilizado no painel administrativo.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
            <p>© {new Date().getFullYear()} Zyveron Play. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-zinc-300 transition">
                Termos de Uso
              </Link>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-400">Media Player Software</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
