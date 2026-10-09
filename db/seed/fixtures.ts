// Fixed reference data: the section tree, freight methods, coupons and the 21 hand-written
// products from the design (kept verbatim, so the storefront opens exactly like the mock-up).
import type { ProductSpec } from '@/models/catalog.schema';
import type { SeedCatalog, SeedSection } from './types';

export const SECTIONS: readonly SeedSection[] = [
  {
    slug: 'mantimentos',
    name: 'Mantimentos',
    children: [
      { slug: 'cafe-e-mate', name: 'Café & Erva-mate' },
      { slug: 'graos-e-farinhas', name: 'Grãos & Farinhas' },
      { slug: 'doces-e-quitutes', name: 'Doces & Quitutes' },
      { slug: 'banhas-e-conservas', name: 'Banhas & Conservas' },
    ],
  },
  {
    slug: 'iluminacao',
    name: 'Iluminação',
    children: [
      { slug: 'lampioes', name: 'Lampiões' },
      { slug: 'velas-e-pavios', name: 'Velas & Pavios' },
      { slug: 'combustiveis', name: 'Combustíveis' },
    ],
  },
  {
    slug: 'vestuario',
    name: 'Vestuário',
    children: [
      { slug: 'chapeus', name: 'Chapéus' },
      { slug: 'calcados', name: 'Calçados' },
      { slug: 'lencos-e-aviamentos', name: 'Lenços & Aviamentos' },
      { slug: 'roupas-de-lida', name: 'Roupas de lida' },
    ],
  },
  {
    slug: 'montaria',
    name: 'Montaria',
    children: [
      { slug: 'selas-e-arreios', name: 'Selas & Arreios' },
      { slug: 'cordas-e-lacos', name: 'Cordas & Laços' },
      { slug: 'trato-do-animal', name: 'Trato do animal' },
    ],
  },
  {
    slug: 'ferramentas',
    name: 'Ferramentas',
    children: [
      { slug: 'corte-e-lenha', name: 'Corte & Lenha' },
      { slug: 'oficina', name: 'Oficina' },
      { slug: 'maquinario', name: 'Maquinário' },
    ],
  },
  {
    slug: 'utensilios',
    name: 'Utensílios',
    children: [
      { slug: 'cozinha', name: 'Cozinha' },
      { slug: 'fogoes', name: 'Fogões' },
      { slug: 'tanoaria', name: 'Tanoaria' },
      { slug: 'asseio', name: 'Asseio' },
    ],
  },
  {
    slug: 'curiosidades',
    name: 'Curiosidades',
    children: [
      { slug: 'amuletos', name: 'Amuletos' },
      { slug: 'instrumentos-oticos', name: 'Instrumentos óticos' },
      { slug: 'aparelhos-misteriosos', name: 'Aparelhos misteriosos' },
    ],
  },
];

export const FREIGHT_METHODS: SeedCatalog['freightMethods'] = [
  {
    code: 'burro',
    name: 'Burro',
    tier: 'Econômico',
    description: 'Anda devagar, para pra comer capim e às vezes empaca. Mas chega.',
    basePriceCents: 0,
    pricePerLeagueCents: 0,
    includedWeightGrams: 30_000,
    pricePerExtraKgCents: 0,
    minDays: 15,
    maxDays: 20,
    leaguesPerExtraDay: 120,
    carriesBulky: false,
    position: 1,
  },
  {
    code: 'cavalo',
    name: 'Cavalo',
    tier: 'Padrão',
    description: 'Galope firme do armazém até a sua porteira.',
    basePriceCents: 1290,
    pricePerLeagueCents: 9,
    includedWeightGrams: 20_000,
    pricePerExtraKgCents: 50,
    minDays: 5,
    maxDays: 7,
    leaguesPerExtraDay: 200,
    carriesBulky: false,
    position: 2,
  },
  {
    code: 'charrete',
    name: 'Charrete',
    tier: 'Volumosos',
    description: 'Para o que não cabe no lombo. Rodas de ferro, paciência de santo.',
    basePriceCents: 2490,
    pricePerLeagueCents: 14,
    includedWeightGrams: 100_000,
    pricePerExtraKgCents: 10,
    minDays: 7,
    maxDays: 10,
    leaguesPerExtraDay: 150,
    carriesBulky: true,
    position: 3,
  },
];

export const COUPONS: SeedCatalog['coupons'] = [
  {
    code: 'GALINHA10',
    kind: 'percent_off',
    percentOff: 10,
    message: 'Cupom aceito: 10% de desconto em toda a carroça.',
  },
  {
    code: 'TROTE',
    kind: 'free_freight',
    message: 'Cupom aceito: frete grátis, o cocheiro é seu compadre.',
  },
  {
    code: '1887',
    kind: 'amount_off',
    amountOffCents: 1887,
    message: 'Cupom aceito: R$ 18,87 de desconto, pela fundação.',
  },
];

export interface DesignReview {
  authorName: string;
  authorPlace: string;
  rating: number;
  title: string;
  body: string;
}

/** The four letters from the design; each hand-written product shows three in rotation. */
export const DESIGN_REVIEWS: readonly DesignReview[] = [
  {
    authorName: 'Dona Benedita',
    authorPlace: 'Ouro Preto, MG',
    rating: 5,
    title: 'Chegou inteirinho',
    body: 'O burro demorou, mas trouxe junto um bilhete muito educado. Recomendo.',
  },
  {
    authorName: 'Seu Juvenal',
    authorPlace: 'Campanha, MG',
    rating: 4,
    title: 'Bom, mas o cavalo comeu a fita',
    body: 'Produto excelente. Faltou só um pedaço da embalagem, que o cocheiro jura que foi o vento.',
  },
  {
    authorName: 'Sinhá Mariquinha',
    authorPlace: 'Pelotas, RS',
    rating: 5,
    title: 'Melhor que na capital',
    body: 'Paguei com três galinhas e ainda me deram troco em ovos.',
  },
  {
    authorName: 'Coronel Tibúrcio',
    authorPlace: 'Itu, SP',
    rating: 3,
    title: 'Atrasou por causa do rio',
    body: 'A ponte estava fechada, mas o telegrama avisou com antecedência. Gostei da honestidade.',
  },
];

export interface HandcraftedProduct {
  slug: string;
  name: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents?: number;
  rating: number;
  ratingCount: number;
  badge?: string;
  optionName?: string;
  options?: readonly string[];
  /** Shown in "Novidades da Semana". */
  isNew?: boolean;
  isBulky?: boolean;
  weightGrams: number;
  description: string;
  specs: ProductSpec[];
}

export const HANDCRAFTED_PRODUCTS: readonly HandcraftedProduct[] = [
  {
    slug: 'lampiao',
    name: 'Lampião a querosene',
    categorySlug: 'lampioes',
    priceCents: 8990,
    compareAtCents: 10990,
    rating: 4.6,
    ratingCount: 128,
    badge: 'Mais vendido',
    optionName: 'Acabamento',
    options: ['Latão', 'Ferro negro', 'Cobre'],
    isNew: true,
    weightGrams: 1200,
    description:
      'Ilumina a varanda, o paiol e as conversas até tarde. Pavio de algodão trançado e reservatório para oito horas de luz amarelinha.',
    specs: [
      ['Material', 'Latão e vidro soprado'],
      ['Autonomia', '8 horas por carga'],
      ['Altura', '32 cm'],
      ['Peso', '1,2 kg'],
    ],
  },
  {
    slug: 'chapeu',
    name: 'Chapéu de feltro',
    categorySlug: 'chapeus',
    priceCents: 14900,
    rating: 4.8,
    ratingCount: 86,
    optionName: 'Tamanho',
    options: ['P', 'M', 'G', 'GG'],
    isNew: true,
    weightGrams: 180,
    description:
      'Aba larga para o sol de meio-dia e a chuva de fim de tarde. Feltro de lã batida com fita de gorgorão.',
    specs: [
      ['Material', 'Feltro de lã'],
      ['Aba', '8 cm'],
      ['Cor', 'Tabaco'],
      ['Peso', '180 g'],
    ],
  },
  {
    slug: 'ferradura',
    name: 'Ferradura da sorte',
    categorySlug: 'amuletos',
    priceCents: 2490,
    rating: 4.9,
    ratingCount: 312,
    badge: 'Dá sorte',
    weightGrams: 450,
    description: 'Forjada a mão. Pendure com as pontas para cima, para a sorte não escorrer.',
    specs: [
      ['Material', 'Ferro forjado'],
      ['Largura', '12 cm'],
      ['Sorte', 'Não garantida por escrito'],
    ],
  },
  {
    slug: 'cafe',
    name: 'Saco de café 5 kg',
    categorySlug: 'cafe-e-mate',
    priceCents: 11900,
    compareAtCents: 13900,
    rating: 4.7,
    ratingCount: 204,
    optionName: 'Torra',
    options: ['Clara', 'Média', 'Escura'],
    isNew: true,
    weightGrams: 5000,
    description:
      'Grãos do Sul de Minas, secos no terreiro e torrados no tacho. Rende umas seiscentas xícaras de prosa.',
    specs: [
      ['Origem', 'Sul de Minas'],
      ['Peso', '5 kg'],
      ['Moagem', 'Em grão'],
      ['Validade', '12 meses'],
    ],
  },
  {
    slug: 'radio',
    name: 'Rádio de válvula',
    categorySlug: 'aparelhos-misteriosos',
    priceCents: 38900,
    rating: 4.2,
    ratingCount: 17,
    badge: 'Chegou do futuro',
    isNew: true,
    weightGrams: 4800,
    description:
      'Ninguém sabe como veio parar aqui. Capta vozes misteriosas e, às vezes, um tal de “sertanejo universitário”.',
    specs: [
      ['Válvulas', '5'],
      ['Faixas', 'AM e mistério'],
      ['Ano', 'Incerto'],
      ['Peso', '4,8 kg'],
    ],
  },
  {
    slug: 'sela',
    name: 'Sela de couro',
    categorySlug: 'selas-e-arreios',
    priceCents: 129000,
    rating: 4.9,
    ratingCount: 42,
    optionName: 'Couro',
    options: ['Natural', 'Café', 'Negro'],
    weightGrams: 9000,
    description:
      'Couro de curtimento vegetal, costura dupla e arreio de latão. Seu cavalo vai agradecer (em silêncio).',
    specs: [
      ['Couro', 'Curtimento vegetal'],
      ['Assento', '17 polegadas'],
      ['Peso', '9 kg'],
    ],
  },
  {
    slug: 'cuia',
    name: 'Cuia de chimarrão',
    categorySlug: 'cozinha',
    priceCents: 5990,
    rating: 4.8,
    ratingCount: 156,
    optionName: 'Bocal',
    options: ['Alpaca', 'Latão'],
    isNew: true,
    weightGrams: 350,
    description:
      'Porongo selecionado com bocal trabalhado. A bomba é vendida separadamente; a roda de mate, não.',
    specs: [
      ['Material', 'Porongo e alpaca'],
      ['Capacidade', '300 ml'],
    ],
  },
  {
    slug: 'banha',
    name: 'Vidro de banha',
    categorySlug: 'banhas-e-conservas',
    priceCents: 1850,
    rating: 4.3,
    ratingCount: 61,
    weightGrams: 900,
    description:
      'Banha de porco caipira, derretida devagar. Para torresmo, pão de queijo e as receitas da bisavó.',
    specs: [
      ['Peso', '900 g'],
      ['Origem', 'Sítio do Seu Lauro'],
    ],
  },
  {
    slug: 'costura',
    name: 'Máquina de costura de pedal',
    categorySlug: 'maquinario',
    priceCents: 189000,
    rating: 4.7,
    ratingCount: 23,
    isBulky: true,
    weightGrams: 38_000,
    description:
      'Ferro fundido, gabinete de imbuia e um pedal que dispensa tomada — até porque tomada ainda não foi inventada.',
    specs: [
      ['Peso', '38 kg'],
      ['Dimensões', '95 × 45 × 80 cm'],
      ['Frete', 'Somente charrete'],
    ],
  },
  {
    slug: 'barril',
    name: 'Barril de carvalho',
    categorySlug: 'tanoaria',
    priceCents: 79000,
    rating: 4.6,
    ratingCount: 31,
    badge: 'Só de charrete',
    optionName: 'Capacidade',
    options: ['50 L', '100 L'],
    isNew: true,
    isBulky: true,
    weightGrams: 22_000,
    description:
      'Aduelas de carvalho e aros de ferro. Não cabe no lombo do burro — ele já tentou, e ficou ofendido.',
    specs: [
      ['Madeira', 'Carvalho'],
      ['Aros', 'Ferro'],
      ['Frete', 'Somente charrete'],
    ],
  },
  {
    slug: 'rapadura',
    name: 'Rapadura de 1 kg',
    categorySlug: 'doces-e-quitutes',
    priceCents: 1490,
    rating: 4.5,
    ratingCount: 98,
    weightGrams: 1000,
    description: 'Doce de engenho, firme por fora e macia no coração.',
    specs: [
      ['Peso', '1 kg'],
      ['Origem', 'Engenho Boa Vista'],
    ],
  },
  {
    slug: 'botas',
    name: 'Botas de montaria',
    categorySlug: 'calcados',
    priceCents: 45900,
    rating: 4.6,
    ratingCount: 54,
    optionName: 'Número',
    options: ['38', '39', '40', '41', '42', '43'],
    weightGrams: 1800,
    description: 'Cano alto, sola costurada e bico que já viu muita estrada.',
    specs: [
      ['Couro', 'Vaqueta'],
      ['Cano', '35 cm'],
    ],
  },
  {
    slug: 'corda',
    name: 'Corda de sisal 20 m',
    categorySlug: 'cordas-e-lacos',
    priceCents: 3990,
    rating: 4.4,
    ratingCount: 77,
    weightGrams: 1500,
    description: 'Trançada em três pernas. Serve para laço, varal e amarrar promessa.',
    specs: [
      ['Comprimento', '20 m'],
      ['Bitola', '12 mm'],
    ],
  },
  {
    slug: 'bule',
    name: 'Bule de ágata',
    categorySlug: 'cozinha',
    priceCents: 7990,
    rating: 4.7,
    ratingCount: 112,
    optionName: 'Cor',
    options: ['Azul', 'Vermelho', 'Branco'],
    weightGrams: 700,
    description: 'Esmaltado, vai direto na chapa do fogão a lenha.',
    specs: [
      ['Capacidade', '1,5 L'],
      ['Material', 'Ferro esmaltado'],
    ],
  },
  {
    slug: 'machadinha',
    name: 'Machadinha',
    categorySlug: 'corte-e-lenha',
    priceCents: 12900,
    rating: 4.5,
    ratingCount: 39,
    weightGrams: 900,
    description: 'Cabo de guatambu e lâmina temperada no óleo.',
    specs: [
      ['Peso', '900 g'],
      ['Cabo', '38 cm'],
    ],
  },
  {
    slug: 'sabao',
    name: 'Sabão de cinzas',
    categorySlug: 'asseio',
    priceCents: 990,
    rating: 4.1,
    ratingCount: 203,
    weightGrams: 400,
    description: 'Feito no tacho, com cinza de fogão e muita paciência.',
    specs: [['Peso', '400 g']],
  },
  {
    slug: 'fogao',
    name: 'Fogão a lenha',
    categorySlug: 'fogoes',
    priceCents: 249000,
    rating: 4.8,
    ratingCount: 12,
    isBulky: true,
    weightGrams: 120_000,
    description: 'Quatro bocas, forno e serpentina. O coração de qualquer cozinha.',
    specs: [
      ['Peso', '120 kg'],
      ['Frete', 'Somente charrete'],
    ],
  },
  {
    slug: 'lenco',
    name: 'Lenço de algodão',
    categorySlug: 'lencos-e-aviamentos',
    priceCents: 2990,
    rating: 4.6,
    ratingCount: 140,
    optionName: 'Cor',
    options: ['Vermelho', 'Azul', 'Xadrez'],
    weightGrams: 60,
    description: 'Para o pescoço, para a poeira ou para acenar da estação.',
    specs: [['Tamanho', '60 × 60 cm']],
  },
  {
    slug: 'luneta',
    name: 'Luneta de latão',
    categorySlug: 'instrumentos-oticos',
    priceCents: 34900,
    rating: 4.4,
    ratingCount: 19,
    weightGrams: 800,
    description: 'Avista a carroça do armazém a três léguas de distância.',
    specs: [
      ['Aumento', '25×'],
      ['Comprimento', '45 cm aberta'],
    ],
  },
  {
    slug: 'querosene',
    name: 'Querosene (1 L)',
    categorySlug: 'combustiveis',
    priceCents: 2200,
    rating: 4.2,
    ratingCount: 88,
    weightGrams: 900,
    description: 'Combustível para o lampião. Mantenha longe do rapé.',
    specs: [['Volume', '1 L']],
  },
  {
    slug: 'vela',
    name: 'Caixa de velas de sebo',
    categorySlug: 'velas-e-pavios',
    priceCents: 3490,
    rating: 4.0,
    ratingCount: 66,
    weightGrams: 1000,
    description: 'Doze velas para quando o querosene acabar.',
    specs: [['Unidades', '12']],
  },
];
