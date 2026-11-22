import React from "react";
import Link from "next/link";
import { AlertCircle, FileText, ArrowLeft, Tv, ShieldAlert, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Termos de Uso e Isenção de Responsabilidade - Zyveron Play",
  description: "Termos de Uso e Declaração de Isenção de Responsabilidade sobre Direitos Autorais do Zyveron Play.",
};

export default function TermsOfUsePage() {
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
            href="/privacy"
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            Ver Política de Privacidade
          </Link>
        </div>

        {/* Content Card */}
        <div className="bg-[#0c121a] border border-zinc-800/80 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-3 border border-cyan-500/20">
              <ShieldAlert className="w-3.5 h-3.5" /> Isenção Legal de Direitos Autorais
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Termos de Uso e Isenção de Responsabilidade
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Última atualização: {lastUpdated}</p>
          </div>

          {/* Destaque Principal de Isenção (Obrigatório para Google Play e Lojas de TV) */}
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>AVISO LEGAL IMPORTANTE SOBRE DIREITOS AUTORAIS</span>
            </div>
            <p>
              O <strong>Zyveron Play</strong> é única e exclusivamente um software reprodutor de mídia (Media Player) e <strong>NÃO FORNECE, NÃO HOSPEDA, NÃO TRANSMITE E NÃO INCLUI</strong> nenhum tipo de conteúdo audiovisual, listas de canais, filmes, séries ou transmissões de TV ao vivo pré-carregadas.
            </p>
            <p>
              O usuário é o <strong>único e integral responsável</strong> pelo fornecimento e legalidade de qualquer lista ou conteúdo reproduzido através do aplicativo.
            </p>
          </div>

          <div className="prose prose-invert prose-cyan max-w-none space-y-6 text-sm text-zinc-300 leading-relaxed">
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                1. Natureza do Software
              </h3>
              <p>
                O <strong>Zyveron Play</strong> atua de maneira análoga a navegadores de internet e reprodutores de mídia genéricos (como VLC Media Player e reprodutores nativos de sistemas operacionais). O aplicativo é projetado para decodificar e renderizar fluxos de áudio e vídeo nos padrões HLS, TS e MP4 a partir de URLs fornecidas diretamente pelo próprio usuário ou por seus provedores de serviço autorizados.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                2. Ausência de Conteúdos e Serviços de Assinatura Multimídia
              </h3>
              <p>
                Os desenvolvedores do <strong>Zyveron Play</strong> expressamente declaram que:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                <li>
                  Não vendemos, não distribuímos e não comercializamos pacotes de canais de TV, filmes, eventos esportivos ou produções cinematográficas.
                </li>
                <li>
                  Não possuímos afiliação, parceria ou ligação contratual com quaisquer provedores de listas de reprodução ou serviços IPTV de terceiros.
                </li>
                <li>
                  Qualquer taxa eventualmente cobrada pelo aplicativo refere-se exclusivamente à licença de uso do software reprodutor e aos custos de desenvolvimento e manutenção técnica em diferentes sistemas operacionais.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                3. Responsabilidade do Usuário
              </h3>
              <p>Ao utilizar o Zyveron Play, você concorda que:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                <li>É o único responsável por garantir que possui o direito legal de reproduzir qualquer fluxo ou lista multimídia inserida.</li>
                <li>Não utilizará o software para acessar materiais protegidos por direitos autorais sem a expressa autorização do titular dos direitos.</li>
                <li>Assume total responsabilidade cível e criminal por qualquer infração cometida pelo uso indevido de listas não autorizadas.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                4. Política Antipirataria e Notificação DMCA
              </h3>
              <p>
                Respeitamos integralmente os direitos de propriedade intelectual e as legislações vigentes (incluindo a Lei de Direitos Autorais nº 9.610/98 e o Digital Millennium Copyright Act - DMCA). Por não hospedarmos nenhum conteúdo em nossos servidores, a remoção de um fluxo ilegal deve ser solicitada diretamente ao provedor da transmissão de origem. No entanto, colaboramos plenamente com titulares de direitos autorais para mitigar qualquer uso indevido de nosso software.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                5. Limitação de Responsabilidade
              </h3>
              <p>
                O software é fornecido "no estado em que se encontra" (as-is), sem garantias de disponibilidade ininterrupta de fluxos externos de terceiros. Os desenvolvedores não se responsabilizam por falhas na transmissão, congelamentos, remoção de canais por parte dos servidores externos configurados pelo usuário, ou danos decorrentes da utilização do reprodutor.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                6. Aceitação dos Termos
              </h3>
              <p>
                A instalação, vinculação ou utilização do Zyveron Play em qualquer plataforma (Smart TV, Mobile ou Desktop) implica na leitura, compreensão e concordância integral e irrestrita com os presentes Termos de Uso e com a nossa Política de Privacidade.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
            <p>© {new Date().getFullYear()} Zyveron Play. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-zinc-300 transition">
                Política de Privacidade
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
