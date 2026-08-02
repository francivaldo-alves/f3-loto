export type LotteryType =
  | 'maismilionaria'
  | 'megasena'
  | 'lotofacil'
  | 'quina'
  | 'lotomania'
  | 'timemania'
  | 'duplasena'
  | 'federal'
  | 'diadesorte'
  | 'supersete';

export interface LotteryConfig {
  id: LotteryType;
  name: string;
  shortName: string;
  badge: string;
  color: string;
  secondaryColor: string;
  gradient: string;
  minNumber: number;
  maxNumber: number;
  defaultBetCount: number;
  allowedBetCounts: number[];
  numberPadding: number;
  hasTrevos?: boolean;
  maxTrevos?: number;
  hasSpecialTeam?: boolean;
  hasMonth?: boolean;
  hasColumns?: boolean;
  totalColumns?: number;
  description: string;
}

export interface LotteryPrizeTier {
  descricao: string;
  faixa: number;
  ganhadores: number;
  valorPremio: number;
}

export interface LotteryWinnerLocation {
  ganhadores: number;
  municipio: string;
  uf: string;
  posicao: number;
}

export interface LotteryDraw {
  loteria: string;
  concurso: number;
  data: string;
  local: string;
  dezenas: string[];
  dezenasOrdemSorteio?: string[];
  trevos?: string[];
  timeCoracao?: string | null;
  mesSorte?: string | null;
  premiacoes?: LotteryPrizeTier[];
  localGanhadores?: LotteryWinnerLocation[];
  acumulou: boolean;
  proximoConcurso?: number;
  dataProximoConcurso?: string;
  valorArrecadado?: number;
  valorEstimadoProximoConcurso?: number;
  valorAcumuladoProximoConcurso?: number;
  observacao?: string;
}

export interface NumberFrequency {
  number: string;
  numValue: number;
  count: number;
  percentage: number;
  delay: number;
  isHot: boolean;
  isCold: boolean;
  isDelayed: boolean;
  isPrime?: boolean;
  isFrame?: boolean;
  lastConcurso: number | null;
}

export interface GeneratorOptions {
  strategy: 'specialist' | 'weighted' | 'closure' | 'hot' | 'balanced' | 'custom';
  numbersPerBet: number;
  numberOfBets: number;
  fixedNumbers: string[];
  excludedNumbers: string[];
  evenOddBalance: 'any' | 'balanced' | 'more_evens' | 'more_odds';
  applyGaussFilter?: boolean;
}

export interface GeneratedBet {
  id: string;
  numbers: string[];
  trevos?: string[];
  strategy: 'specialist' | 'weighted' | 'closure' | 'hot' | 'balanced' | 'custom';
  hotRate: number;
  evenCount: number;
  oddCount: number;
  evenOddRatio: string;
  primesCount: number;
  frameCenterRatio: string;
  quadrantDistribution: string;
  sum: number;
  probabilityBoost: number;
  mathScore: string;
  specialistScore: number; // 0 a 100
  specialistVerdict: string;
  simulatedHits?: {
    totalTested: number;
    maxHits: number;
    hitsBreakdown: { [key: number]: number };
  };
}

export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  maismilionaria: {
    id: 'maismilionaria',
    name: '+MaisMilionária',
    shortName: 'Milionária',
    badge: '+M',
    color: '#1a365d',
    secondaryColor: '#cca300',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #b45309 100%)',
    minNumber: 1,
    maxNumber: 50,
    defaultBetCount: 6,
    allowedBetCounts: [6, 7, 8, 9, 10, 11, 12],
    numberPadding: 2,
    hasTrevos: true,
    maxTrevos: 6,
    description: 'Escolha 6 números (1-50) e 2 trevos (1-6).'
  },
  megasena: {
    id: 'megasena',
    name: 'Mega-Sena',
    shortName: 'Mega',
    badge: 'MS',
    color: '#209869',
    secondaryColor: '#059669',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 50%, #047857 100%)',
    minNumber: 1,
    maxNumber: 60,
    defaultBetCount: 6,
    allowedBetCounts: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    numberPadding: 2,
    description: 'O prêmio principal de 6 acertos (Sena).'
  },
  lotofacil: {
    id: 'lotofacil',
    name: 'Lotofácil',
    shortName: 'Lotofácil',
    badge: 'LF',
    color: '#930089',
    secondaryColor: '#c026d3',
    gradient: 'linear-gradient(135deg, #581c87 0%, #a21caf 50%, #e879f9 100%)',
    minNumber: 1,
    maxNumber: 25,
    defaultBetCount: 15,
    allowedBetCounts: [15, 16, 17, 18, 19, 20],
    numberPadding: 2,
    description: 'Escolha de 15 a 20 números dos 25 disponíveis.'
  },
  quina: {
    id: 'quina',
    name: 'Quina',
    shortName: 'Quina',
    badge: 'QN',
    color: '#260085',
    secondaryColor: '#4338ca',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)',
    minNumber: 1,
    maxNumber: 80,
    defaultBetCount: 5,
    allowedBetCounts: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    numberPadding: 2,
    description: 'Acerte 2, 3, 4 ou 5 números entre 80 disponíveis.'
  },
  lotomania: {
    id: 'lotomania',
    name: 'Lotomania',
    shortName: 'Lotomania',
    badge: 'LM',
    color: '#f78b00',
    secondaryColor: '#ea580c',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)',
    minNumber: 0,
    maxNumber: 99,
    defaultBetCount: 50,
    allowedBetCounts: [50],
    numberPadding: 2,
    description: 'Escolha 50 números de 00 a 99.'
  },
  timemania: {
    id: 'timemania',
    name: 'Timemania',
    shortName: 'Timemania',
    badge: 'TM',
    color: '#00cc66',
    secondaryColor: '#16a34a',
    gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #4ade80 100%)',
    minNumber: 1,
    maxNumber: 80,
    defaultBetCount: 10,
    allowedBetCounts: [10],
    numberPadding: 2,
    hasSpecialTeam: true,
    description: 'Escolha 10 números de 80 e o seu Time do Coração.'
  },
  duplasena: {
    id: 'duplasena',
    name: 'Dupla Sena',
    shortName: 'Dupla Sena',
    badge: 'DS',
    color: '#a61324',
    secondaryColor: '#dc2626',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)',
    minNumber: 1,
    maxNumber: 50,
    defaultBetCount: 6,
    allowedBetCounts: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    numberPadding: 2,
    description: 'Com o mesmo bilhete você concorre em 2 sorteios por concurso.'
  },
  federal: {
    id: 'federal',
    name: 'Loterica Federal',
    shortName: 'Federal',
    badge: 'FD',
    color: '#155e75',
    secondaryColor: '#0891b2',
    gradient: 'linear-gradient(135deg, #164e63 0%, #0891b2 50%, #22d3ee 100%)',
    minNumber: 1,
    maxNumber: 99999,
    defaultBetCount: 5,
    allowedBetCounts: [5],
    numberPadding: 5,
    description: 'Cinco bilhetes premiados em cada extração.'
  },
  diadesorte: {
    id: 'diadesorte',
    name: 'Dia de Sorte',
    shortName: 'Dia de Sorte',
    badge: 'DS',
    color: '#cb8500',
    secondaryColor: '#d97706',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)',
    minNumber: 1,
    maxNumber: 31,
    defaultBetCount: 7,
    allowedBetCounts: [7, 8, 9, 10, 11, 12, 13, 14, 15],
    numberPadding: 2,
    hasMonth: true,
    description: 'Escolha de 7 a 15 números (1-31) e um Mês de Sorte.'
  },
  supersete: {
    id: 'supersete',
    name: 'Super Sete',
    shortName: 'Super Sete',
    badge: 'SS',
    color: '#a3e635',
    secondaryColor: '#65a30d',
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 50%, #a3e635 100%)',
    minNumber: 0,
    maxNumber: 9,
    defaultBetCount: 7,
    allowedBetCounts: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    numberPadding: 1,
    hasColumns: true,
    totalColumns: 7,
    description: '7 colunas com números de 0 a 9 em cada uma.'
  }
};
