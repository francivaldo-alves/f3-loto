import { Injectable } from '@angular/core';
import { LotteryConfig, LotteryDraw, NumberFrequency } from '../models/lottery.model';

@Injectable({
  providedIn: 'root'
})
export class StatsEngineService {
  private readonly PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);

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
   * Calcula as estatísticas de frequência, atraso, primos e moldura em 1 única passagem
   */
  calculateFrequencies(rawDraws: LotteryDraw[], config: LotteryConfig): NumberFrequency[] {
    if (!rawDraws || rawDraws.length === 0) {
      return this.generateEmptyFrequencies(config);
    }

    const draws = rawDraws.length > 200 ? rawDraws.slice(0, 200) : rawDraws;
    const totalDraws = draws.length;
    const maxConcurso = draws[0]?.concurso || 0;
    const countMap: Map<string, { count: number; lastConcurso: number | null }> = new Map();

    for (let i = config.minNumber; i <= config.maxNumber; i++) {
      const formattedNum = this.formatNumber(i, config.numberPadding);
      countMap.set(formattedNum, { count: 0, lastConcurso: null });
    }

    for (let i = 0; i < totalDraws; i++) {
      const draw = draws[i];
      if (draw.dezenas && Array.isArray(draw.dezenas)) {
        for (let j = 0; j < draw.dezenas.length; j++) {
          const rawNum = draw.dezenas[j];
          const val = parseInt(rawNum, 10);
          if (!isNaN(val)) {
            const formatted = this.formatNumber(val, config.numberPadding);
            const current = countMap.get(formatted);
            if (current) {
              current.count += 1;
              if (current.lastConcurso === null) {
                current.lastConcurso = draw.concurso;
              }
            }
          }
        }
      }
    }

    const frequencies: NumberFrequency[] = [];
    countMap.forEach((val, numStr) => {
      const numVal = parseInt(numStr, 10);
      const percentage = totalDraws > 0 ? (val.count / totalDraws) * 100 : 0;
      const delay = val.lastConcurso !== null ? maxConcurso - val.lastConcurso : totalDraws;

      frequencies.push({
        number: numStr,
        numValue: numVal,
        count: val.count,
        percentage: Number(percentage.toFixed(1)),
        delay: delay,
        isHot: false,
        isCold: false,
        isDelayed: false,
        isPrime: this.isPrime(numVal),
        isFrame: this.isFrameNumber(numVal, config),
        lastConcurso: val.lastConcurso
      });
    });

    const sortedByCount = [...frequencies].sort((a, b) => b.count - a.count);
    const topCountThreshold = Math.max(1, Math.floor(frequencies.length * 0.25));
    const bottomCountThreshold = Math.max(1, Math.floor(frequencies.length * 0.25));

    const hotSet = new Set(sortedByCount.slice(0, topCountThreshold).map(f => f.number));
    const coldSet = new Set(sortedByCount.slice(-bottomCountThreshold).map(f => f.number));

    const sortedByDelay = [...frequencies].sort((a, b) => b.delay - a.delay);
    const delayedSet = new Set(sortedByDelay.slice(0, topCountThreshold).map(f => f.number));

    frequencies.forEach(f => {
      f.isHot = hotSet.has(f.number);
      f.isCold = coldSet.has(f.number);
      f.isDelayed = delayedSet.has(f.number);
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

    const draws = rawDraws.length > 200 ? rawDraws.slice(0, 200) : rawDraws;
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
        isHot: false,
        isCold: false,
        isDelayed: false,
        isPrime: this.isPrime(i),
        isFrame: this.isFrameNumber(i, config),
        lastConcurso: null
      });
    }
    return list;
  }
}
