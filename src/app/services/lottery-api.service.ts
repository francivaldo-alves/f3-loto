import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, merge } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { LotteryDraw, LotteryType } from '../models/lottery.model';

@Injectable({
  providedIn: 'root'
})
export class LotteryApiService {
  private readonly baseUrl = 'https://loteriascaixa-api.herokuapp.com/api';
  
  private historyCache: Map<string, Observable<LotteryDraw[]>> = new Map();
  private latestCache: Map<LotteryType, Observable<LotteryDraw>> = new Map();

  public loading$ = new BehaviorSubject<boolean>(false);
  public error$ = new BehaviorSubject<string | null>(null);

  // Snapshot inicial instantâneo (0ms) para que a Home abra imediatamente
  private seedDraws: Record<LotteryType, LotteryDraw> = {
    maismilionaria: { loteria: 'maismilionaria', concurso: 376, data: '29/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['01', '02', '35', '38', '40', '45'], trevos: ['3', '4'], acumulou: true, valorEstimadoProximoConcurso: 79000000, dataProximoConcurso: '01/08/2026' },
    megasena: { loteria: 'megasena', concurso: 3038, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['30', '35', '38', '39', '46', '50'], acumulou: true, valorEstimadoProximoConcurso: 100000000, dataProximoConcurso: '01/08/2026' },
    lotofacil: { loteria: 'lotofacil', concurso: 3168, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['01', '03', '05', '06', '08', '09', '11', '12', '14', '17', '18', '20', '21', '23', '25'], acumulou: false, valorEstimadoProximoConcurso: 1700000, dataProximoConcurso: '01/08/2026' },
    quina: { loteria: 'quina', concurso: 6494, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['12', '24', '36', '48', '60'], acumulou: true, valorEstimadoProximoConcurso: 14500000, dataProximoConcurso: '01/08/2026' },
    lotomania: { loteria: 'lotomania', concurso: 2654, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['03', '07', '12', '18', '22', '29', '34', '41', '45', '50', '56', '61', '68', '73', '79', '82', '87', '91', '94', '98'], acumulou: true, valorEstimadoProximoConcurso: 8500000, dataProximoConcurso: '01/08/2026' },
    timemania: { loteria: 'timemania', concurso: 2124, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['05', '14', '23', '38', '47', '61', '72'], timeCoracao: 'FLAMENGO/RJ', acumulou: true, valorEstimadoProximoConcurso: 12000000, dataProximoConcurso: '01/08/2026' },
    duplasena: { loteria: 'duplasena', concurso: 2694, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['04', '11', '23', '31', '40', '48'], acumulou: true, valorEstimadoProximoConcurso: 4200000, dataProximoConcurso: '01/08/2026' },
    federal: { loteria: 'federal', concurso: 5887, data: '29/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['04821', '19432', '38210', '49123', '67319'], acumulou: false, valorEstimadoProximoConcurso: 500000, dataProximoConcurso: '01/08/2026' },
    diadesorte: { loteria: 'diadesorte', concurso: 945, data: '30/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['03', '07', '14', '19', '22', '28', '31'], mesSorte: 'MAIO', acumulou: true, valorEstimadoProximoConcurso: 2500000, dataProximoConcurso: '01/08/2026' },
    supersete: { loteria: 'supersete', concurso: 574, data: '29/07/2026', local: 'Espaço da Sorte em SÃO PAULO, SP', dezenas: ['3', '7', '1', '9', '4', '0', '6'], acumulou: true, valorEstimadoProximoConcurso: 1800000, dataProximoConcurso: '01/08/2026' }
  };

  constructor(private http: HttpClient) {}

  /**
   * Retorna os dados semente instantâneos (0ms) para renderização imediata do Dashboard
   */
  getInitialSeedMap(): Map<LotteryType, LotteryDraw> {
    const seedMap = new Map<LotteryType, LotteryDraw>();
    Object.keys(this.seedDraws).forEach(key => {
      const type = key as LotteryType;
      // Tentar ler de localStorage primeiro
      const localData = this.getFromLocalStorage<LotteryDraw>(`sortloto_latest_${type}`);
      seedMap.set(type, localData || this.seedDraws[type]);
    });
    return seedMap;
  }

  /**
   * Carrega atualizações individuais por canal de forma assíncrona e não bloqueante
   */
  fetchLatestDrawsIndividually(lotteryTypes: LotteryType[], callback: (type: LotteryType, draw: LotteryDraw) => void): void {
    lotteryTypes.forEach(type => {
      this.getLatestDraw(type, true).subscribe(draw => {
        if (draw) {
          callback(type, draw);
        }
      });
    });
  }

  /**
   * Busca o último concurso de uma loteria específica
   */
  getLatestDraw(type: LotteryType, forceRefresh = false): Observable<LotteryDraw | null> {
    if (!forceRefresh && this.latestCache.has(type)) {
      return this.latestCache.get(type)! as Observable<LotteryDraw | null>;
    }

    const localCacheKey = `sortloto_latest_${type}`;
    const localData = this.getFromLocalStorage<LotteryDraw>(localCacheKey);

    const request$ = this.http.get<LotteryDraw>(`${this.baseUrl}/${type}/latest`).pipe(
      tap(draw => {
        if (draw) {
          this.saveToLocalStorage(localCacheKey, draw);
        }
      }),
      catchError(err => {
        console.warn(`[LotteryApiService] Usando snapshot local para ${type}.`, err);
        if (localData) return of(localData);
        return of(this.seedDraws[type] || null);
      }),
      shareReplay(1)
    );

    this.latestCache.set(type, request$ as Observable<LotteryDraw>);
    return request$ as Observable<LotteryDraw | null>;
  }

  /**
   * Busca o histórico de sorteios cortando o payload para limite de segurança
   */
  getLotteryHistory(type: LotteryType, limit: number = 150, forceRefresh = false): Observable<LotteryDraw[]> {
    const effectiveLimit = limit > 0 ? Math.min(limit, 300) : 150;
    const cacheKey = `${type}_limit_${effectiveLimit}`;
    
    if (!forceRefresh && this.historyCache.has(cacheKey)) {
      return this.historyCache.get(cacheKey)!;
    }

    const localCacheKey = `sortloto_history_${type}_${effectiveLimit}`;
    const localData = this.getFromLocalStorage<LotteryDraw[]>(localCacheKey);

    this.loading$.next(true);
    this.error$.next(null);

    const request$ = this.http.get<LotteryDraw[]>(`${this.baseUrl}/${type}`).pipe(
      map(draws => {
        if (!Array.isArray(draws)) return [];
        return draws.slice(0, effectiveLimit);
      }),
      tap(draws => {
        this.loading$.next(false);
        if (draws.length > 0) {
          this.saveToLocalStorage(localCacheKey, draws);
        }
      }),
      catchError(err => {
        console.warn(`[LotteryApiService] Usando cache local para ${type}`, err);
        this.loading$.next(false);
        if (localData && localData.length > 0) {
          return of(localData.slice(0, effectiveLimit));
        }
        this.error$.next(`Falha ao conectar com o servidor da Caixa.`);
        return of([]);
      }),
      shareReplay(1)
    );

    this.historyCache.set(cacheKey, request$);
    return request$;
  }

  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        payload: data
      }));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }

  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      return parsed.payload as T;
    } catch (e) {
      return null;
    }
  }
}
