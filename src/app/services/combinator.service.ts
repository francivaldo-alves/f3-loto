import { Injectable } from '@angular/core';
import { GeneratedBet, GeneratorOptions, LotteryConfig, LotteryDraw, NumberFrequency } from '../models/lottery.model';
import { StatsEngineService } from './stats-engine.service';

@Injectable({
  providedIn: 'root'
})
export class CombinatorService {
  constructor(private statsEngine: StatsEngineService) {}

  /**
   * Gera combinações otimizadas com modelos de estatística matemática especialista
   */
  generateCombinations(
    config: LotteryConfig,
    frequencies: NumberFrequency[],
    options: GeneratorOptions,
    draws: LotteryDraw[] = []
  ): GeneratedBet[] {
    const bets: GeneratedBet[] = [];
    const allNumbers = frequencies.map(f => f.number);
    
    const freqMap = new Map<string, number>();
    frequencies.forEach(f => {
      freqMap.set(f.number, f.count);
    });

    const hotNumbers = [...frequencies].sort((a, b) => b.count - a.count).map(f => f.number);
    const delayedNumbers = [...frequencies].sort((a, b) => b.delay - a.delay).map(f => f.number);
    const avgGlobalFreq = frequencies.reduce((acc, f) => acc + f.count, 0) / (frequencies.length || 1);
    const topHotSet = new Set(hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.35)));

    const fixedSet = new Set((options.fixedNumbers || []).map(n => this.pad(n, config.numberPadding)));
    const excludedSet = new Set((options.excludedNumbers || []).map(n => this.pad(n, config.numberPadding)));

    const countToGenerate = Math.min(Math.max(1, options.numberOfBets), 50);
    const targetSize = options.numbersPerBet || config.defaultBetCount;

    if (options.strategy === 'closure') {
      return this.generateMatrixClosureBets(config, frequencies, options, draws, topHotSet, avgGlobalFreq);
    }

    let attempts = 0;
    const maxAttempts = countToGenerate * 250;

    while (bets.length < countToGenerate && attempts < maxAttempts) {
      attempts++;
      const candidateNumbers = new Set<string>(fixedSet);

      if (options.strategy === 'specialist') {
        // --- ESTRATÉGIA DO ESPECIALISTA ESTATÍSTICO ---
        // Blend: 50% Top Quentes + 25% Frequência Média + 25% Atrasados Ponderados
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.35)).filter(n => !excludedSet.has(n));
        const poolDelayed = delayedNumbers.slice(0, Math.ceil(delayedNumbers.length * 0.25)).filter(n => !excludedSet.has(n));
        const poolOther = allNumbers.filter(n => !excludedSet.has(n));
        
        const combined = [...poolHot, ...poolHot, ...poolDelayed, ...poolOther];
        this.shuffle(combined);

        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }
      } else if (options.strategy === 'weighted') {
        const eligible = allNumbers.filter(n => !excludedSet.has(n) && !fixedSet.has(n));
        const picked = this.weightedSample(eligible, freqMap, targetSize - candidateNumbers.size);
        picked.forEach(n => candidateNumbers.add(n));
      } else if (options.strategy === 'hot') {
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.45)).filter(n => !excludedSet.has(n));
        const poolOther = allNumbers.filter(n => !excludedSet.has(n));
        const combined = [...poolHot, ...poolHot, ...poolOther];
        this.shuffle(combined);
        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }
      } else if (options.strategy === 'balanced') {
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.4)).filter(n => !excludedSet.has(n));
        const poolDelayed = delayedNumbers.slice(0, Math.ceil(delayedNumbers.length * 0.3)).filter(n => !excludedSet.has(n));
        const poolAll = allNumbers.filter(n => !excludedSet.has(n));
        const combined = [...poolHot, ...poolHot, ...poolDelayed, ...poolAll];
        this.shuffle(combined);
        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }
      } else {
        const pool = allNumbers.filter(n => !excludedSet.has(n));
        this.shuffle(pool);
        for (let i = 0; i < pool.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(pool[i]);
        }
      }

      if (candidateNumbers.size < targetSize) {
        for (let i = 0; i < allNumbers.length && candidateNumbers.size < targetSize; i++) {
          const num = allNumbers[i];
          if (!excludedSet.has(num)) candidateNumbers.add(num);
        }
      }

      const numbersArray = Array.from(candidateNumbers).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const betKey = numbersArray.join('-');

      if (bets.some(b => b.numbers.join('-') === betKey)) {
        continue;
      }

      const evens = numbersArray.filter(n => parseInt(n, 10) % 2 === 0).length;
      const odds = numbersArray.length - evens;

      if (options.evenOddBalance === 'balanced') {
        const diff = Math.abs(evens - odds);
        if (diff > 3) continue;
      } else if (options.evenOddBalance === 'more_evens' && evens <= odds) {
        continue;
      } else if (options.evenOddBalance === 'more_odds' && odds <= evens) {
        continue;
      }

      // Validação Especialista: Primos, Moldura e Quadrantes
      const numVals = numbersArray.map(n => parseInt(n, 10));
      const primesCount = numVals.filter(n => this.statsEngine.isPrime(n)).length;
      const frameCount = numVals.filter(n => this.statsEngine.isFrameNumber(n, config)).length;
      const centerCount = numbersArray.length - frameCount;

      // Se estiver na estratégia do especialista, aplicar validação estrita de Primos e Moldura
      if (options.strategy === 'specialist') {
        if (config.id === 'megasena' && (primesCount < 1 || primesCount > 4)) continue;
        if (config.id === 'lotofacil' && (frameCount < 8 || frameCount > 11)) continue;
      }

      const sum = numVals.reduce((acc, curr) => acc + curr, 0);
      if (options.applyGaussFilter !== false && !this.isValidGaussDistribution(numVals, config)) {
        continue;
      }

      const avgBetFreq = numVals.reduce((acc, num) => acc + (freqMap.get(this.pad(num.toString(), config.numberPadding)) || 0), 0) / numbersArray.length;
      const rawBoost = avgGlobalFreq > 0 ? ((avgBetFreq - avgGlobalFreq) / avgGlobalFreq) * 100 : 0;
      const probabilityBoost = Number(Math.max(5, Math.min(185, rawBoost + 25)).toFixed(1));

      const hotCount = numbersArray.filter(n => topHotSet.has(n)).length;
      const hotRate = Number(((hotCount / numbersArray.length) * 100).toFixed(0));

      const quadrantDistribution = this.calculateQuadrants(numVals, config);
      const specialistScore = this.calculateSpecialistScore(hotRate, probabilityBoost, primesCount, frameCount, numbersArray.length, config);
      const specialistVerdict = this.getSpecialistVerdictText(specialistScore);

      let trevos: string[] | undefined;
      if (config.hasTrevos) {
        trevos = this.generateTrevos();
      }

      const bet: GeneratedBet = {
        id: `bet-${Date.now()}-${bets.length + 1}`,
        numbers: numbersArray,
        trevos,
        strategy: options.strategy,
        hotRate,
        evenCount: evens,
        oddCount: odds,
        evenOddRatio: `${evens}P / ${odds}Í`,
        primesCount,
        frameCenterRatio: `${frameCount} Moldura / ${centerCount} Miolo`,
        quadrantDistribution,
        sum,
        probabilityBoost,
        mathScore: this.getMathScoreText(probabilityBoost, hotRate),
        specialistScore,
        specialistVerdict
      };

      if (draws && draws.length > 0) {
        bet.simulatedHits = this.simulateHits(bet.numbers, draws);
      }

      bets.push(bet);
    }

    return bets;
  }

  private generateMatrixClosureBets(
    config: LotteryConfig,
    frequencies: NumberFrequency[],
    options: GeneratorOptions,
    draws: LotteryDraw[],
    topHotSet: Set<string>,
    avgGlobalFreq: number
  ): GeneratedBet[] {
    const bets: GeneratedBet[] = [];
    const countToGenerate = Math.min(Math.max(1, options.numberOfBets), 50);
    const targetSize = options.numbersPerBet || config.defaultBetCount;

    const poolSize = Math.min(config.maxNumber, Math.max(targetSize + 4, targetSize * 2));
    const hotPool = [...frequencies]
      .sort((a, b) => b.count - a.count)
      .slice(0, poolSize)
      .map(f => f.number);

    for (let i = 0; i < countToGenerate; i++) {
      const numbersSet = new Set<string>();

      options.fixedNumbers.forEach(n => numbersSet.add(this.pad(n, config.numberPadding)));

      let offset = (i * 2) % hotPool.length;
      for (let j = 0; j < hotPool.length && numbersSet.size < targetSize; j++) {
        const idx = (offset + j) % hotPool.length;
        const num = hotPool[idx];
        if (!options.excludedNumbers.includes(num)) {
          numbersSet.add(num);
        }
      }

      if (numbersSet.size < targetSize) {
        for (let k = config.minNumber; k <= config.maxNumber && numbersSet.size < targetSize; k++) {
          const numStr = this.pad(k.toString(), config.numberPadding);
          if (!options.excludedNumbers.includes(numStr)) {
            numbersSet.add(numStr);
          }
        }
      }

      const numbersArray = Array.from(numbersSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const numVals = numbersArray.map(n => parseInt(n, 10));
      const evens = numVals.filter(n => n % 2 === 0).length;
      const odds = numbersArray.length - evens;
      const sum = numVals.reduce((acc, curr) => acc + curr, 0);

      const primesCount = numVals.filter(n => this.statsEngine.isPrime(n)).length;
      const frameCount = numVals.filter(n => this.statsEngine.isFrameNumber(n, config)).length;
      const centerCount = numbersArray.length - frameCount;

      const hotCount = numbersArray.filter(n => topHotSet.has(n)).length;
      const hotRate = Number(((hotCount / numbersArray.length) * 100).toFixed(0));
      const probabilityBoost = Number((35 + (hotRate * 0.8)).toFixed(1));

      const quadrantDistribution = this.calculateQuadrants(numVals, config);
      const specialistScore = this.calculateSpecialistScore(hotRate, probabilityBoost, primesCount, frameCount, numbersArray.length, config);

      let trevos: string[] | undefined;
      if (config.hasTrevos) {
        trevos = this.generateTrevos();
      }

      const bet: GeneratedBet = {
        id: `bet-closure-${Date.now()}-${i + 1}`,
        numbers: numbersArray,
        trevos,
        strategy: 'closure',
        hotRate,
        evenCount: evens,
        oddCount: odds,
        evenOddRatio: `${evens}P / ${odds}Í`,
        primesCount,
        frameCenterRatio: `${frameCount} Moldura / ${centerCount} Miolo`,
        quadrantDistribution,
        sum,
        probabilityBoost,
        mathScore: 'Fechamento Garantido',
        specialistScore,
        specialistVerdict: 'Desdobramento por Cobertura de Matriz'
      };

      if (draws && draws.length > 0) {
        bet.simulatedHits = this.simulateHits(bet.numbers, draws);
      }

      bets.push(bet);
    }

    return bets;
  }

  private calculateQuadrants(vals: number[], config: LotteryConfig): string {
    const q1Limit = Math.floor(config.maxNumber * 0.25);
    const q2Limit = Math.floor(config.maxNumber * 0.50);
    const q3Limit = Math.floor(config.maxNumber * 0.75);

    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    vals.forEach(v => {
      if (v <= q1Limit) q1++;
      else if (v <= q2Limit) q2++;
      else if (v <= q3Limit) q3++;
      else q4++;
    });

    return `Q1:${q1} | Q2:${q2} | Q3:${q3} | Q4:${q4}`;
  }

  private calculateSpecialistScore(hotRate: number, boost: number, primes: number, frame: number, total: number, config: LotteryConfig): number {
    let score = 70;
    score += Math.min(15, hotRate * 0.15);
    score += Math.min(10, boost * 0.1);

    // Bônus para equilíbrio de Primos e Moldura
    if (config.id === 'megasena' && (primes >= 1 && primes <= 3)) score += 5;
    if (config.id === 'lotofacil' && (frame >= 8 && frame <= 11)) score += 5;

    return Math.min(99, Math.round(score));
  }

  private getSpecialistVerdictText(score: number): string {
    if (score >= 90) return 'Excelente Padrão Estatístico da Caixa';
    if (score >= 80) return 'Forte Alinhamento com Histórico Vencedor';
    return 'Boa Diversificação Estatística';
  }

  private weightedSample(candidates: string[], freqMap: Map<string, number>, countNeeded: number): string[] {
    const selected: string[] = [];
    const pool = [...candidates];

    while (selected.length < countNeeded && pool.length > 0) {
      const weights = pool.map(n => Math.pow((freqMap.get(n) || 1), 2));
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      let random = Math.random() * totalWeight;
      let chosenIdx = 0;

      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          chosenIdx = i;
          break;
        }
      }

      selected.push(pool[chosenIdx]);
      pool.splice(chosenIdx, 1);
    }

    return selected;
  }

  private isValidGaussDistribution(vals: number[], config: LotteryConfig): boolean {
    let consecutiveCount = 1;
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i + 1] === vals[i] + 1) {
        consecutiveCount++;
        if (consecutiveCount >= 4) return false;
      } else {
        consecutiveCount = 1;
      }
    }

    const sum = vals.reduce((a, b) => a + b, 0);
    const avgNum = (config.minNumber + config.maxNumber) / 2;
    const expectedSum = avgNum * vals.length;
    const minSumAllowed = expectedSum * 0.45;
    const maxSumAllowed = expectedSum * 1.55;

    return sum >= minSumAllowed && sum <= maxSumAllowed;
  }

  simulateHits(betNumbers: string[], rawDraws: LotteryDraw[]): { totalTested: number; maxHits: number; hitsBreakdown: { [key: number]: number } } {
    const draws = rawDraws.length > 100 ? rawDraws.slice(0, 100) : rawDraws;
    const betSet = new Set(betNumbers.map(n => parseInt(n, 10).toString()));
    const hitsBreakdown: { [key: number]: number } = {};
    let maxHits = 0;

    for (let i = 0; i < draws.length; i++) {
      const draw = draws[i];
      if (draw.dezenas && Array.isArray(draw.dezenas)) {
        let hits = 0;
        for (let j = 0; j < draw.dezenas.length; j++) {
          if (betSet.has(parseInt(draw.dezenas[j], 10).toString())) {
            hits++;
          }
        }
        if (hits > 0) {
          hitsBreakdown[hits] = (hitsBreakdown[hits] || 0) + 1;
        }
        if (hits > maxHits) {
          maxHits = hits;
        }
      }
    }

    return {
      totalTested: draws.length,
      maxHits,
      hitsBreakdown
    };
  }

  private getMathScoreText(boost: number, hotRate: number): string {
    if (boost > 50 || hotRate >= 80) return 'Alta Probabilidade 🏆';
    if (boost > 30 || hotRate >= 60) return 'Forte Otimização ⚡';
    return 'Matematicamente Equilibrado ⚖️';
  }

  private generateTrevos(): string[] {
    const available = ['1', '2', '3', '4', '5', '6'];
    this.shuffle(available);
    return available.slice(0, 2).sort();
  }

  private shuffle(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private pad(numStr: string, padding: number): string {
    const n = parseInt(numStr, 10);
    return isNaN(n) ? numStr : n.toString().padStart(padding, '0');
  }
}
