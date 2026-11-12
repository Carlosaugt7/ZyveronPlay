import { AdultContentHelper } from './adultContent';

/**
 * Classificador e Ordenador de Categorias IPTV (Fiel ao APK Android TV)
 * Ordem obrigatória:
 * 1. Regionais & Abertos
 * 2. Canais Temáticos / Nacionais
 * 3. Canais 24 Horas
 * 4. Canais Internacionais
 * 5. Canais Adultos (+18 / XXX)
 */

const internationalPrefixOrCodeRegex = /(?:^|[\s\[\|\(\-_])(?:us|usa|eua|uk|gb|eng|pt|prt|es|esp|fr|fra|it|ita|de|deu|ru|rus|ar|arg|cl|chl|co|col|mx|mex|uy|ury|py|pry|pe|per|ve|ven|ca|can|int|lat|latin|arab|turk)(?:[\s\]\|\)\-_:]|$)/i;

const flagEmojiRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;

const internationalKeywords = [
  'internaciona', 'international', 'exterior', 'mundo', 'world',
  'europa', 'europe', 'european', 'latino', 'latinos', 'latin', 'hispano', 'hispanic',
  'asia', 'ásia', 'africa', 'áfrica', 'oceania', 'oriente',
  'estados unidos', 'united states', 'usa', 'eua', 'american', 'americana',
  'united kingdom', 'inglaterra', 'reino unido', 'british', 'britanico', 'britânico', 'english',
  'portugal', 'portugues', 'português', 'tvi', 'sic ', 'rtp',
  'espanha', 'españa', 'spain', 'spanish', 'espanhol',
  'italia', 'italy', 'italian', 'italiano', 'rai ',
  'frança', 'franca', 'france', 'french', 'francês', 'frances',
  'alemanha', 'germany', 'german', 'alemão', 'alemao', 'deutsch',
  'argentina', 'argentino', 'chile', 'chileno', 'colombia', 'colômbia',
  'mexico', 'méxico', 'mexicano', 'uruguai', 'uruguay', 'paraguai', 'paraguay',
  'peru', 'peruano', 'venezuela', 'bolivia', 'bolívia', 'equador', 'ecuador',
  'canada', 'canadá', 'japao', 'japão', 'japan', 'japanese',
  'china', 'chinese', 'coreia', 'korea', 'turquia', 'turkey', 'turk',
  'russia', 'rússia', 'russian', 'arabe', 'árabe', 'arab'
];

export function is24HorasCategory(name: string): boolean {
  const n = (name || '').toLowerCase().trim();
  return (
    n.includes('24h') ||
    n.includes('24 h') ||
    n.includes('24 horas') ||
    n.includes('24horas') ||
    n.includes('24/7') ||
    n.includes('vinte e quatro')
  );
}

export function isInternationalCategory(name: string): boolean {
  const n = (name || '').toLowerCase().trim();

  // 1. Emoji de bandeira internacional (exceto Brasil isolado 🇧🇷)
  if (flagEmojiRegex.test(name)) {
    const hasBrFlag = name.includes('\uD83C\uDDE7\uD83C\uDDF7');
    if (!hasBrFlag) return true;
  }

  // 2. Termos e países internacionais
  if (internationalKeywords.some((kw) => n.includes(kw))) return true;

  // 3. Códigos e delimitadores padrão IPTV ([US], [PT], etc.)
  if (internationalPrefixOrCodeRegex.test(n)) return true;

  return false;
}

export function isRegionalOrAbertoCategory(name: string): boolean {
  if (isInternationalCategory(name)) return false;
  if (is24HorasCategory(name)) return false;
  if (AdultContentHelper.isAdultCategory(name)) return false;

  const n = (name || '').toLowerCase().trim();
  const regionalTerms = [
    'aberto', 'abertos', 'tv aberta', 'canal aberto', 'canais abertos',
    'regional', 'regionais', 'local', 'locais', 'estadual', 'estaduais',
    'globo', 'sbt', 'record', 'band', 'bandeirantes',
    'redetv', 'rede tv', 'tv brasil', 'cultura', 'afiliada', 'afiliadas'
  ];
  return regionalTerms.some((term) => n.includes(term));
}

export function getCategoryPriority(categoryName: string): number {
  if (AdultContentHelper.isAdultCategory(categoryName)) return 5;
  if (isInternationalCategory(categoryName)) return 4;
  if (is24HorasCategory(categoryName)) return 3;
  if (isRegionalOrAbertoCategory(categoryName)) return 1;
  return 2; // Temáticos / Nacionais normais
}

/**
 * Ordena as categorias de TV seguindo a divisão oficial do APK:
 * Regionais & Abertos -> Temáticos -> 24 Horas -> Internacionais -> Adultos (+18)
 */
export function sortLiveCategories<T extends { category_name: string }>(categories: T[]): T[] {
  const regionais: T[] = [];
  const regulares: T[] = [];
  const vinteQuatro: T[] = [];
  const internacionais: T[] = [];
  const adultos: T[] = [];

  categories.forEach((cat) => {
    const priority = getCategoryPriority(cat.category_name);
    if (priority === 1) regionais.push(cat);
    else if (priority === 3) vinteQuatro.push(cat);
    else if (priority === 4) internacionais.push(cat);
    else if (priority === 5) adultos.push(cat);
    else regulares.push(cat);
  });

  return [...regionais, ...regulares, ...vinteQuatro, ...internacionais, ...adultos];
}
