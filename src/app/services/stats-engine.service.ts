import { Injectable } from '@angular/core';
import { LotteryConfig, LotteryDraw, NumberFrequency, PairFrequency } from '../models/lottery.model';

@Injectable({
  providedIn: 'root'
})
export class StatsEngineService {
  private readonly PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);

  /** Janela de sorteios recentes para análise de tendência */
  private readonly TREND_WINDOW = 30;

  constructor() {}

  /**
   * Verifica se o número é primo
   */
  isPrime(num: number): boolean {
    return this.PRIMES.has(num);
  }

  /**
   * Verifica se a dezena está na moldura do volante
   */
  isFrameNumber(num: number, config: LotteryConfig): boolean {
    if (config.id === 'lotofacil') {
      const frameSet = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
      return frameSet.has(num);
    }
    if (config.id === 'megasena') {
      // Moldura de 6x10: linhas 1 e 6, colunas 1 e 0 (terminação 1 ou 0)
      if (num >= 1 && num <= 10) return true;
      if (num >= 51 && num <= 60) return true;
      if (num % 10 === 1 || num % 10 === 0) return true;
      return false;
    }
    if (config.id === 'quina') {
      if (num <= 10 || num >= 71) return true;
      if (num % 10 === 1 || num % 10 === 0) return true;
      return false;
    }
    return num % 2 === 0;
  }

  /**
   * Calcula as estatísticas de frequência, atraso correto, tendência e primos
   * em 1 única passagem sobre o histórico.
   *
   * CORREÇÃO: o atraso agora usa o concurso MAIS RECENTE (menor índice no array
   * que vem do mais novo para o mais antigo), não o primeiro encontrado.
   */
  calculateFrequencies(rawDraws: LotteryDraw[], config: LotteryConfig): NumberFrequency[] {
    if (!rawDraws || rawDraws.length === 0) {
      return this.generateEmptyFrequencies(config);
    }

    // Ampliar o limite para 300 sorteios para análise mais robusta
    const draws = rawDraws.length > 300 ? rawDraws.slice(0, 300) : rawDraws;
    const totalDraws = draws.length;
    const maxConcurso = draws[0]?.concurso || 0;

    // --- Janela recente ---
    const recentWindow = Math.min(this.TREND_WINDOW, totalDraws);
    const recentDraws = draws.slice(0, recentWindow);

    // countMap: { count total, lastConcurso (MAIS RECENTE), recentCount }
    const countMap: Map<string, { count: number; lastConcurso: number | null; recentCount: number }> = new Map();

    for (let i = config.minNumber; i <= config.maxNumber; i++) {
      const formattedNum = this.formatNumber(i, config.numberPadding);
      countMap.set(formattedNum, { count: 0, lastConcurso: null, recentCount: 0 });
    }

    // Passagem 1: histórico completo (count e lastConcurso MAIS RECENTE)
    // O array vem do mais novo para o mais antigo, então o PRIMEIRO encontro
    // é o mais recente — por isso guardamos apenas a primeira ocorrência.
    for (let i = 0; i < totalDraws; i++) {
      const draw = draws[i];
      if (draw.dezenas && Array.isArray(draw.dezenas)) {
        for (let j = 0; j < draw.dezenas.length; j++) {
          const val = parseInt(draw.dezenas[j], 10);
          if (!isNaN(val)) {
            const formatted = this.formatNumber(val, config.numberPadding);
            const current = countMap.get(formatted);
            if (current) {
              current.count += 1;
              // Guarda apenas a aparição MAIS RECENTE (primeiro encontrado no array desc.)
              if (current.lastConcurso === null) {
                current.lastConcurso = draw.concurso;
              }
            }
          }
        }
      }
    }

    // Passagem 2: janela recente para trendScore
    for (let i = 0; i < recentDraws.length; i++) {
      const draw = recentDraws[i];
      if (draw.dezenas && Array.isArray(draw.dezenas)) {
        for (let j = 0; j < draw.dezenas.length; j++) {
          const val = parseInt(draw.dezenas[j], 10);
          if (!isNaN(val)) {
            const formatted = this.formatNumber(val, config.numberPadding);
            const current = countMap.get(formatted);
            if (current) {
              current.recentCount += 1;
            }
          }
        }
      }
    }

    const frequencies: NumberFrequency[] = [];
    countMap.forEach((val, numStr) => {
      const numVal = parseInt(numStr, 10);
      const percentage = totalDraws > 0 ? (val.count / totalDraws) * 100 : 0;
      // Atraso: número de concursos desde a última aparição
      const delay = val.lastConcurso !== null ? maxConcurso - val.lastConcurso : totalDraws;
      const recentPercentage = recentWindow > 0 ? (val.recentCount / recentWindow) * 100 : 0;

      // trendScore positivo = dezena "em alta" recentemente
      // Usa diferença relativa; evita divisão por zero com fallback
      const trendScore = percentage > 0
        ? ((recentPercentage - percentage) / percentage) * 100
        : (recentPercentage > 0 ? 100 : 0);

      frequencies.push({
        number: numStr,
        numValue: numVal,
        count: val.count,
        percentage: Number(percentage.toFixed(1)),
        delay,
        recentCount: val.recentCount,
        recentPercentage: Number(recentPercentage.toFixed(1)),
        trendScore: Number(trendScore.toFixed(1)),
        isHot: false,
        isCold: false,
        isDelayed: false,
        isTrending: false,
        isPrime: this.isPrime(numVal),
        isFrame: this.isFrameNumber(numVal, config),
        lastConcurso: val.lastConcurso
      });
    });

    // Classificar hot / cold / delayed / trending
    const sortedByCount = [...frequencies].sort((a, b) => b.count - a.count);
    const topCountThreshold = Math.max(1, Math.floor(frequencies.length * 0.25));
    const bottomCountThreshold = Math.max(1, Math.floor(frequencies.length * 0.25));

    const hotSet = new Set(sortedByCount.slice(0, topCountThreshold).map(f => f.number));
    const coldSet = new Set(sortedByCount.slice(-bottomCountThreshold).map(f => f.number));

    const sortedByDelay = [...frequencies].sort((a, b) => b.delay - a.delay);
    const delayedSet = new Set(sortedByDelay.slice(0, topCountThreshold).map(f => f.number));

    // Top 25% em trendScore = "em tendência de alta"
    const sortedByTrend = [...frequencies].sort((a, b) => b.trendScore - a.trendScore);
    const trendingSet = new Set(sortedByTrend.slice(0, topCountThreshold).map(f => f.number));

    frequencies.forEach(f => {
      f.isHot = hotSet.has(f.number);
      f.isCold = coldSet.has(f.number);
      f.isDelayed = delayedSet.has(f.number);
      f.isTrending = trendingSet.has(f.number);
    });

    return frequencies.sort((a, b) => a.numValue - b.numValue);
  }

  /**
   * Calcula a proporção Média de Pares e Ímpares
   */
  calculateEvenOddStats(rawDraws: LotteryDraw[]): { avgEvens: number; avgOdds: number; commonRatios: { ratio: string; percentage: number }[] } {
    if (!rawDraws || rawDraws.length === 0) {
      return { avgEvens: 0, avgOdds: 0, commonRatios: [] };
    }

    const draws = rawDraws.length > 300 ? rawDraws.slice(0, 300) : rawDraws;
    let totalEvens = 0;
    let totalOdds = 0;
    const ratioCounts: Record<string, number> = {};

    for (let i = 0; i < draws.length; i++) {
      const draw = draws[i];
      if (draw.dezenas && Array.isArray(draw.dezenas)) {
        let evens = 0;
        let odds = 0;
        for (let j = 0; j < draw.dezenas.length; j++) {
          const val = parseInt(draw.dezenas[j], 10);
          if (!isNaN(val)) {
            if (val % 2 === 0) evens++;
            else odds++;
          }
        }
        totalEvens += evens;
        totalOdds += odds;
        const key = `${evens}P / ${odds}Í`;
        ratioCounts[key] = (ratioCounts[key] || 0) + 1;
      }
    }

    const count = draws.length;
    const commonRatios = Object.keys(ratioCounts)
      .map(ratio => ({
        ratio,
        percentage: Number(((ratioCounts[ratio] / count) * 100).toFixed(1))
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      avgEvens: Number((totalEvens / count).toFixed(1)),
      avgOdds: Number((totalOdds / count).toFixed(1)),
      commonRatios
    };
  }

  /**
   * Calcula os N pares de dezenas que mais co-ocorreram no histórico.
   * Útil para a estratégia specialist priorizar combinações sinérgicas.
   */
  calculateTopPairs(rawDraws: LotteryDraw[], config: LotteryConfig, topN = 20): PairFrequency[] {
    if (!rawDraws || rawDraws.length === 0) return [];

    const draws = rawDraws.length > 300 ? rawDraws.slice(0, 300) : rawDraws;
    const pairCounts: Map<string, number> = new Map();

    for (const draw of draws) {
      if (!draw.dezenas || !Array.isArray(draw.dezenas)) continue;
      const nums = draw.dezenas
        .map(d => this.formatNumber(parseInt(d, 10), config.numberPadding))
        .sort();

      for (let i = 0; i < nums.length - 1; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          const key = `${nums[i]}|${nums[j]}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    }

    const totalDraws = draws.length;
    return Array.from(pairCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([key, count]) => {
        const [a, b] = key.split('|');
        return { a, b, count, percentage: Number(((count / totalDraws) * 100).toFixed(1)) };
      });
  }

  private formatNumber(num: number, padding: number): string {
    return num.toString().padStart(padding, '0');
  }

  private generateEmptyFrequencies(config: LotteryConfig): NumberFrequency[] {
    const list: NumberFrequency[] = [];
    for (let i = config.minNumber; i <= config.maxNumber; i++) {
      list.push({
        number: this.formatNumber(i, config.numberPadding),
        numValue: i,
        count: 0,
        percentage: 0,
        delay: 0,
        recentCount: 0,
        recentPercentage: 0,
        trendScore: 0,
        isHot: false,
        isCold: false,
        isDelayed: false,
        isTrending: false,
        isPrime: this.isPrime(i),
        isFrame: this.isFrameNumber(i, config),
        lastConcurso: null
      });
    }
    return list;
  }
}
