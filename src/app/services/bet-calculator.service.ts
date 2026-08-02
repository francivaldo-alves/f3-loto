import { Injectable } from '@angular/core';
import { GeneratedBet, LotteryConfig } from '../models/lottery.model';

@Injectable({ providedIn: 'root' })
export class BetCalculatorService {

  /**
   * C(n, k) — combinações sem repetição (iterativo para evitar overflow)
   */
  combinations(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  }

  /**
   * Custo de UMA aposta com numbersPerBet dezenas selecionadas.
   * Fórmula: C(numbersPerBet, config.defaultBetCount) × config.basePrice
   * Loterias com aposta fixa (lotomania, timemania) retornam sempre basePrice.
   */
  getBetCost(config: LotteryConfig, numbersPerBet: number): number {
    // Loterias de aposta fixa: não há desdobramento
    if (['lotomania', 'timemania', 'supersete', 'federal'].includes(config.id)) {
      return config.basePrice;
    }
    const combs = this.combinations(numbersPerBet, config.defaultBetCount);
    return combs * config.basePrice;
  }

  /**
   * Custo total de N apostas com numbersPerBet dezenas.
   */
  getTotalCost(config: LotteryConfig, numbersPerBet: number, numberOfBets: number): number {
    return this.getBetCost(config, numbersPerBet) * numberOfBets;
  }

  /**
   * Formata valor em BRL.
   */
  formatBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Retorna o rótulo de risco da taxa de retorno.
   */
  getReturnRateLabel(rate: number): string {
    if (rate >= 65) return 'Melhor retorno';
    if (rate >= 50) return 'Retorno moderado';
    return 'Baixo retorno';
  }

  /**
   * Cor da barra de retorno baseada na taxa.
   */
  getReturnRateColor(rate: number): string {
    if (rate >= 65) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  }

  /**
   * Calcula a tabela de custos para todos os tamanhos de aposta permitidos.
   */
  getCostTable(config: LotteryConfig): { count: number; combs: number; cost: number }[] {
    return config.allowedBetCounts.map(count => ({
      count,
      combs: this.combinations(count, config.defaultBetCount),
      cost: this.getBetCost(config, count)
    }));
  }

  /**
   * Analisa os hits simulados e calcula quantas vezes atingiu prêmio mínimo.
   */
  analyzeSimulatedHits(
    bets: GeneratedBet[],
    config: LotteryConfig
  ): { totalBets: number; betsWithPrize: number; bestHit: number; costPerBet: number; totalCost: number } {
    if (!bets.length) {
      return { totalBets: 0, betsWithPrize: 0, bestHit: 0, costPerBet: 0, totalCost: 0 };
    }
    const costPerBet = this.getBetCost(config, bets[0].numbers.length);
    const totalCost = costPerBet * bets.length;
    let betsWithPrize = 0;
    let bestHit = 0;

    bets.forEach(bet => {
      if (bet.simulatedHits) {
        if (bet.simulatedHits.maxHits >= config.minHitsForPrize) {
          betsWithPrize++;
        }
        bestHit = Math.max(bestHit, bet.simulatedHits.maxHits);
      }
    });

    return { totalBets: bets.length, betsWithPrize, bestHit, costPerBet, totalCost };
  }
}
