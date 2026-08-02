import { Injectable } from '@angular/core';
import { GeneratedBet, GeneratorOptions, LotteryConfig, LotteryDraw, NumberFrequency } from '../models/lottery.model';
import { StatsEngineService } from './stats-engine.service';

@Injectable({
  providedIn: 'root'
})
export class CombinatorService {
  constructor(private statsEngine: StatsEngineService) {}

  /**
   * Gera combinações otimizadas com modelos de estatística matemática especialista.
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
    const trendMap = new Map<string, number>();
    frequencies.forEach(f => {
      freqMap.set(f.number, f.count);
      trendMap.set(f.number, f.trendScore ?? 0);
    });

    // Ordenações base
    const hotNumbers = [...frequencies].sort((a, b) => b.count - a.count).map(f => f.number);
    const delayedNumbers = [...frequencies].sort((a, b) => b.delay - a.delay).map(f => f.number);
    const trendingNumbers = [...frequencies].sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0)).map(f => f.number);

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
    const maxAttempts = countToGenerate * 300;
    const usedKeys = new Set<string>();

    while (bets.length < countToGenerate && attempts < maxAttempts) {
      attempts++;
      const candidateNumbers = new Set<string>(fixedSet);

      // ---- Seleção de candidatos por estratégia ----
      if (options.strategy === 'specialist') {
        // Blend: 50% Top Quentes + 20% Atrasados + 30% Pool Geral
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.35)).filter(n => !excludedSet.has(n));
        const poolDelayed = delayedNumbers.slice(0, Math.ceil(delayedNumbers.length * 0.20)).filter(n => !excludedSet.has(n));
        const poolOther = allNumbers.filter(n => !excludedSet.has(n));
        const combined = [...poolHot, ...poolHot, ...poolDelayed, ...poolOther];
        this.shuffle(combined);
        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }

      } else if (options.strategy === 'trend') {
        // Dezenas em tendência de alta recente
        const poolTrending = trendingNumbers.slice(0, Math.ceil(trendingNumbers.length * 0.40)).filter(n => !excludedSet.has(n));
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.30)).filter(n => !excludedSet.has(n));
        const poolOther = allNumbers.filter(n => !excludedSet.has(n));
        const combined = [...poolTrending, ...poolTrending, ...poolHot, ...poolOther];
        this.shuffle(combined);
        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }

      } else if (options.strategy === 'weighted') {
        // Roleta ponderada com sqrt para distribuição mais equilibrada (antes era pow²)
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
        const poolHot = hotNumbers.slice(0, Math.ceil(hotNumbers.length * 0.40)).filter(n => !excludedSet.has(n));
        const poolDelayed = delayedNumbers.slice(0, Math.ceil(delayedNumbers.length * 0.30)).filter(n => !excludedSet.has(n));
        const poolAll = allNumbers.filter(n => !excludedSet.has(n));
        const combined = [...poolHot, ...poolHot, ...poolDelayed, ...poolAll];
        this.shuffle(combined);
        for (let i = 0; i < combined.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(combined[i]);
        }

      } else {
        // custom / fallback aleatório
        const pool = allNumbers.filter(n => !excludedSet.has(n));
        this.shuffle(pool);
        for (let i = 0; i < pool.length && candidateNumbers.size < targetSize; i++) {
          candidateNumbers.add(pool[i]);
        }
      }

      // Completar com números não excluídos se necessário
      if (candidateNumbers.size < targetSize) {
        for (let i = 0; i < allNumbers.length && candidateNumbers.size < targetSize; i++) {
          const num = allNumbers[i];
          if (!excludedSet.has(num)) candidateNumbers.add(num);
        }
      }

      const numbersArray = Array.from(candidateNumbers).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const betKey = numbersArray.join('-');

      // Evitar duplicatas
      if (usedKeys.has(betKey)) continue;

      const numVals = numbersArray.map(n => parseInt(n, 10));
      const evens = numVals.filter(n => n % 2 === 0).length;
      const odds = numVals.length - evens;

      // Filtro de par/ímpar
      if (options.evenOddBalance === 'balanced') {
        const diff = Math.abs(evens - odds);
        if (diff > 3) continue;
      } else if (options.evenOddBalance === 'more_evens' && evens <= odds) {
        continue;
      } else if (options.evenOddBalance === 'more_odds' && odds <= evens) {
        continue;
      }

      const primesCount = numVals.filter(n => this.statsEngine.isPrime(n)).length;
      const frameCount = numVals.filter(n => this.statsEngine.isFrameNumber(n, config)).length;
      const centerCount = numbersArray.length - frameCount;

      // Validação por terços (distribuição por terços do volante)
      if (options.applyGaussFilter !== false && !this.isValidGaussDistribution(numVals, config)) {
        continue;
      }

      // Filtro especialista: Primos e Moldura
      if (options.strategy === 'specialist') {
        if (config.id === 'megasena' && (primesCount < 1 || primesCount > 4)) continue;
        if (config.id === 'lotofacil' && (frameCount < 8 || frameCount > 11)) continue;
      }

      const sum = numVals.reduce((acc, curr) => acc + curr, 0);

      const avgBetFreq = numVals.reduce((acc, num) => acc + (freqMap.get(this.pad(num.toString(), config.numberPadding)) || 0), 0) / numbersArray.length;
      const rawBoost = avgGlobalFreq > 0 ? ((avgBetFreq - avgGlobalFreq) / avgGlobalFreq) * 100 : 0;
      const probabilityBoost = Number(Math.max(5, Math.min(185, rawBoost + 25)).toFixed(1));

      const hotCount = numbersArray.filter(n => topHotSet.has(n)).length;
      const hotRate = Number(((hotCount / numbersArray.length) * 100).toFixed(0));

      const trendingCount = numbersArray.filter(n => frequencies.find(f => f.number === n)?.isTrending).length;

      const quadrantDistribution = this.calculateQuadrants(numVals, config);
      const specialistScore = this.calculateSpecialistScore(
        hotRate, probabilityBoost, primesCount, frameCount,
        numbersArray.length, evens, odds, sum, numVals, config
      );
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
        mathScore: this.getMathScoreText(probabilityBoost, hotRate, trendingCount),
        specialistScore,
        specialistVerdict
      };

      if (draws && draws.length > 0) {
        bet.simulatedHits = this.simulateHits(bet.numbers, draws);
      }

      usedKeys.add(betKey);
      bets.push(bet);
    }

    return bets;
  }

  // -----------------------------------------------------------------------
  // Estratégia: Fechamento de Matriz
  // -----------------------------------------------------------------------

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

    const poolSize = Math.min(config.maxNumber - config.minNumber + 1, Math.max(targetSize + 6, targetSize * 2));
    const hotPool = [...frequencies]
      .sort((a, b) => b.count - a.count)
      .slice(0, poolSize)
      .map(f => f.number);

    const usedKeys = new Set<string>();

    for (let i = 0; i < countToGenerate; i++) {
      const numbersSet = new Set<string>();
      options.fixedNumbers.forEach(n => numbersSet.add(this.pad(n, config.numberPadding)));

      // Perturbação aleatória: inicia o offset com um jitter para apostas distintas
      const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(hotPool.length * 0.3)));
      let offset = ((i * 3) + jitter) % hotPool.length;

      for (let j = 0; j < hotPool.length && numbersSet.size < targetSize; j++) {
        const idx = (offset + j) % hotPool.length;
        const num = hotPool[idx];
        if (!options.excludedNumbers.includes(num)) {
          numbersSet.add(num);
        }
      }

      // Completar se necessário
      if (numbersSet.size < targetSize) {
        for (let k = config.minNumber; k <= config.maxNumber && numbersSet.size < targetSize; k++) {
          const numStr = this.pad(k.toString(), config.numberPadding);
          if (!options.excludedNumbers.includes(numStr)) {
            numbersSet.add(numStr);
          }
        }
      }

      const numbersArray = Array.from(numbersSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const betKey = numbersArray.join('-');
      if (usedKeys.has(betKey)) continue;
      usedKeys.add(betKey);

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
      const specialistScore = this.calculateSpecialistScore(
        hotRate, probabilityBoost, primesCount, frameCount,
        numbersArray.length, evens, odds, sum, numVals, config
      );

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

  // -----------------------------------------------------------------------
  // Cálculos auxiliares
  // -----------------------------------------------------------------------

  private calculateQuadrants(vals: number[], config: LotteryConfig): string {
    const range = config.maxNumber - config.minNumber;
    const q1Limit = config.minNumber + Math.floor(range * 0.25);
    const q2Limit = config.minNumber + Math.floor(range * 0.50);
    const q3Limit = config.minNumber + Math.floor(range * 0.75);

    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    vals.forEach(v => {
      if (v <= q1Limit) q1++;
      else if (v <= q2Limit) q2++;
      else if (v <= q3Limit) q3++;
      else q4++;
    });

    return `Q1:${q1} | Q2:${q2} | Q3:${q3} | Q4:${q4}`;
  }

  /**
   * Score do especialista com PENALIDADES reais.
   * Inicia em 60 e ajusta com bônus e penalidades — valores honestos.
   */
  private calculateSpecialistScore(
    hotRate: number,
    boost: number,
    primes: number,
    frame: number,
    total: number,
    evens: number,
    odds: number,
    sum: number,
    vals: number[],
    config: LotteryConfig
  ): number {
    let score = 60;

    // Bônus por dezenas quentes
    score += Math.min(12, hotRate * 0.12);

    // Bônus por boost de probabilidade
    score += Math.min(8, boost * 0.08);

    // Bônus por equilíbrio par/ímpar
    const evenOddDiff = Math.abs(evens - odds);
    if (evenOddDiff <= 1) score += 6;
    else if (evenOddDiff <= 2) score += 3;
    else if (evenOddDiff > Math.ceil(total * 0.4)) score -= 5; // penalidade por extremo

    // Bônus por primos e moldura específicos para cada loteria
    if (config.id === 'megasena' && primes >= 1 && primes <= 3) score += 5;
    if (config.id === 'lotofacil' && frame >= 8 && frame <= 11) score += 5;

    // Penalidade por consecutivos em excesso
    let consecutiveMax = 1;
    let currentRun = 1;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] === vals[i - 1] + 1) {
        currentRun++;
        consecutiveMax = Math.max(consecutiveMax, currentRun);
      } else {
        currentRun = 1;
      }
    }
    if (consecutiveMax >= 4) score -= 8;
    else if (consecutiveMax === 3) score -= 3;

    // Penalidade por desequilíbrio de quadrantes
    const parts = this.calculateQuadrants(vals, config).split(' | ')
      .map(p => parseInt(p.split(':')[1], 10));
    const minQ = Math.min(...parts);
    const maxQ = Math.max(...parts);
    if (maxQ - minQ > Math.ceil(total * 0.6)) score -= 5;

    return Math.min(99, Math.max(40, Math.round(score)));
  }

  private getSpecialistVerdictText(score: number): string {
    if (score >= 90) return 'Excelente Padrão Estatístico da Caixa';
    if (score >= 80) return 'Forte Alinhamento com Histórico Vencedor';
    if (score >= 70) return 'Boa Diversificação Estatística';
    if (score >= 60) return 'Distribuição Aceitável';
    return 'Padrão com Ressalvas Estatísticas';
  }

  /**
   * Roleta ponderada com sqrt(frequência) para distribuição mais equilibrada.
   * O pow² anterior causava monopolização pelas dezenas mais frequentes.
   */
  private weightedSample(candidates: string[], freqMap: Map<string, number>, countNeeded: number): string[] {
    const selected: string[] = [];
    const pool = [...candidates];

    while (selected.length < countNeeded && pool.length > 0) {
      // sqrt dá peso proporcional sem exagerar nos extremos
      const weights = pool.map(n => Math.sqrt(Math.max(1, freqMap.get(n) || 1)));
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      let random = Math.random() * totalWeight;
      let chosenIdx = pool.length - 1; // fallback ao último

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

  /**
   * Validação de distribuição de Gauss melhorada:
   * além de consecutivos e soma, verifica distribuição por TERÇOS do volante.
   */
  private isValidGaussDistribution(vals: number[], config: LotteryConfig): boolean {
    // 1. Nenhum grupo de 4+ consecutivos
    let consecutiveCount = 1;
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i + 1] === vals[i] + 1) {
        consecutiveCount++;
        if (consecutiveCount >= 4) return false;
      } else {
        consecutiveCount = 1;
      }
    }

    // 2. Soma dentro de intervalo razoável (45%–155% da soma esperada)
    const sum = vals.reduce((a, b) => a + b, 0);
    const avgNum = (config.minNumber + config.maxNumber) / 2;
    const expectedSum = avgNum * vals.length;
    const minSumAllowed = expectedSum * 0.45;
    const maxSumAllowed = expectedSum * 1.55;
    if (sum < minSumAllowed || sum > maxSumAllowed) return false;

    // 3. Distribuição por terços — nenhum terço deve concentrar mais de 65% das dezenas
    const rangeTotal = config.maxNumber - config.minNumber;
    const t1Max = config.minNumber + Math.floor(rangeTotal / 3);
    const t2Max = config.minNumber + Math.floor((rangeTotal * 2) / 3);

    const t1 = vals.filter(v => v <= t1Max).length;
    const t2 = vals.filter(v => v > t1Max && v <= t2Max).length;
    const t3 = vals.filter(v => v > t2Max).length;

    const maxAllowed = Math.ceil(vals.length * 0.65);
    if (t1 > maxAllowed || t2 > maxAllowed || t3 > maxAllowed) return false;

    return true;
  }

  /**
   * Simula quantos acertos a aposta teria nos concursos históricos.
   * Ampliado para 200 concursos e inclui eficiência média.
   */
  simulateHits(betNumbers: string[], rawDraws: LotteryDraw[]): {
    totalTested: number;
    maxHits: number;
    hitsBreakdown: { [key: number]: number };
  } {
    const draws = rawDraws.length > 200 ? rawDraws.slice(0, 200) : rawDraws;
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

  private getMathScoreText(boost: number, hotRate: number, trendingCount: number): string {
    if (boost > 50 || hotRate >= 80) return 'Alta Probabilidade 🏆';
    if (trendingCount >= 3) return 'Tendência Forte ⬆️';
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
