import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedBet, LotteryConfig, LotteryDraw, NumberFrequency, PairFrequency } from '../../models/lottery.model';
import { BetCalculatorService } from '../../services/bet-calculator.service';
import { StatsEngineService } from '../../services/stats-engine.service';

interface CostRow {
  count: number;
  combs: number;
  cost: number;
  isSelected: boolean;
}

@Component({
  selector: 'app-roi-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="roi-container glass-panel">

      <!-- ═══ CABEÇALHO ═══ -->
      <div class="roi-header">
        <span class="roi-icon">📐</span>
        <div>
          <h3 class="roi-title">Análise de Custo & Retorno</h3>
          <p class="roi-subtitle">Entenda o valor real das suas apostas antes de jogar.</p>
        </div>
      </div>

      <div class="roi-grid">

        <!-- ─── SEÇÃO 1: Calculadora de Custo ─── -->
        <div class="roi-section">
          <div class="section-head">
            <span class="section-icon">💸</span>
            <h4 class="section-title">Custo por Desdobramento</h4>
          </div>

          <div class="cost-table">
            <div class="cost-header-row">
              <span>Dezenas</span>
              <span>Combinações</span>
              <span>Custo</span>
            </div>
            <div
              *ngFor="let row of costTable; trackBy: trackByCount"
              class="cost-row"
              [class.highlighted]="row.isSelected">
              <span class="cost-num" [class.active]="row.isSelected">{{ row.count }}</span>
              <span class="cost-combs">
                <span *ngIf="row.combs > 1" class="combs-badge">{{ row.combs | number }}×</span>
                <span *ngIf="row.combs === 1" class="combs-simple">Simples</span>
              </span>
              <span class="cost-value" [class.price-warning]="row.cost > 50" [class.price-danger]="row.cost > 500">
                {{ calc.formatBRL(row.cost) }}
              </span>
            </div>
          </div>

          <div class="cost-summary" *ngIf="currentBetSize > 0">
            <div class="summary-line">
              <span>Aposta atual ({{ currentBetSize }} dezenas)</span>
              <strong>{{ calc.formatBRL(costPerBet) }}</strong>
            </div>
            <div class="summary-line total" *ngIf="numberOfBets > 1">
              <span>{{ numberOfBets }} bilhetes no total</span>
              <strong class="total-price">{{ calc.formatBRL(totalCost) }}</strong>
            </div>
          </div>
        </div>

        <!-- ─── SEÇÃO 2: Taxa de Retorno da Loteria ─── -->
        <div class="roi-section">
          <div class="section-head">
            <span class="section-icon">📊</span>
            <h4 class="section-title">Retorno Médio Histórico</h4>
          </div>

          <div class="return-gauge">
            <div class="gauge-label-row">
              <span class="gauge-name">{{ config.name }}</span>
              <span class="gauge-rate" [style.color]="returnColor">{{ config.returnRate }}%</span>
            </div>
            <div class="gauge-bar-wrap">
              <div class="gauge-bar-bg">
                <div
                  class="gauge-bar-fill"
                  [style.width.%]="config.returnRate"
                  [style.background]="returnGradient">
                </div>
              </div>
            </div>
            <div class="gauge-label-bottom">
              <span class="gauge-label-text" [style.color]="returnColor">{{ returnLabel }}</span>
              <span class="gauge-desc">Em cada R$100 apostados, em média <strong>R$ {{ config.returnRate }}</strong> retornam em prêmios</span>
            </div>
          </div>

          <div class="ev-warning">
            <span class="ev-icon">⚠️</span>
            <p>
              O VE (Valor Esperado) por aposta é <strong>sempre negativo</strong> em loterias.
              A loteria é entretenimento — defina um orçamento fixo e nunca ultrapasse.
            </p>
          </div>

          <!-- Ranking de retorno entre as loterias -->
          <div class="return-ranking">
            <span class="ranking-label">Ranking de retorno entre as loterias da Caixa:</span>
            <div class="ranking-bars">
              <div *ngFor="let item of returnRanking; trackBy: trackByLottery" class="rank-row">
                <span class="rank-name" [class.rank-current]="item.id === config.id">{{ item.shortName }}</span>
                <div class="rank-bar-wrap">
                  <div class="rank-bar" [style.width.%]="item.rate" [class.rank-bar-current]="item.id === config.id"></div>
                </div>
                <span class="rank-pct" [class.rank-current]="item.id === config.id">{{ item.rate }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── SEÇÃO 3: Pares Mais Frequentes ─── -->
        <div class="roi-section pairs-section" *ngIf="topPairs.length > 0">
          <div class="section-head">
            <span class="section-icon">🔗</span>
            <h4 class="section-title">Pares que Mais Saem Juntos</h4>
          </div>
          <p class="pairs-subtitle">Dezenas que co-ocorreram com mais frequência nos {{ draws.length }} últimos sorteios.</p>

          <div class="pairs-list">
            <div *ngFor="let pair of topPairs; let i = index; trackBy: trackByPair" class="pair-row">
              <span class="pair-rank">#{{ i + 1 }}</span>
              <div class="pair-balls">
                <span class="pair-ball" [style.background]="config.color">{{ pair.a }}</span>
                <span class="pair-connector">+</span>
                <span class="pair-ball" [style.background]="config.secondaryColor">{{ pair.b }}</span>
              </div>
              <div class="pair-bar-wrap">
                <div class="pair-bar" [style.width.%]="getPairBarWidth(pair.count)"></div>
              </div>
              <span class="pair-count">{{ pair.count }}×</span>
              <span class="pair-pct">{{ pair.percentage }}%</span>
            </div>
          </div>
        </div>

      </div><!-- /roi-grid -->
    </div>
  `,
  styles: [`
    .roi-container {
      padding: 22px;
      margin-bottom: 20px;
      border-radius: var(--radius-lg);
    }

    /* ── Header ── */
    .roi-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }
    .roi-icon { font-size: 1.6rem; flex-shrink: 0; }
    .roi-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
    }
    .roi-subtitle { font-size: 0.82rem; color: var(--text-muted); margin-top: 2px; }

    /* ── Grid principal ── */
    .roi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .pairs-section {
      grid-column: 1 / -1; /* ocupa largura total */
    }

    /* ── Seções ── */
    .roi-section {
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .section-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .section-icon { font-size: 1.1rem; }
    .section-title {
      font-family: var(--font-display);
      font-size: 0.95rem;
      font-weight: 800;
      color: #fff;
    }

    /* ── Tabela de Custos ── */
    .cost-table { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .cost-header-row {
      display: grid;
      grid-template-columns: 2fr 2fr 2fr;
      padding: 4px 8px;
      font-size: 0.67rem;
      font-weight: 700;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cost-row {
      display: grid;
      grid-template-columns: 2fr 2fr 2fr;
      padding: 7px 8px;
      border-radius: 7px;
      border: 1px solid transparent;
      transition: background 0.15s ease;
    }
    .cost-row:hover { background: rgba(255,255,255,0.04); }
    .cost-row.highlighted {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.25);
    }
    .cost-num {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .cost-num.active { color: #34d399; }
    .combs-badge {
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .combs-simple {
      font-size: 0.72rem;
      color: var(--text-subtle);
    }
    .cost-value {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 700;
      color: #ffffff;
      text-align: right;
    }
    .cost-value.price-warning { color: #fbbf24; }
    .cost-value.price-danger  { color: #f87171; }

    .cost-summary {
      background: rgba(0, 0, 0, 0.25);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .summary-line.total {
      border-top: 1px dashed rgba(255,255,255,0.1);
      padding-top: 6px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
    }
    .total-price { color: #34d399; font-size: 1rem; }

    /* ── Gauge de Retorno ── */
    .return-gauge { margin-bottom: 14px; }
    .gauge-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .gauge-name { font-size: 0.85rem; font-weight: 700; color: #fff; }
    .gauge-rate { font-size: 1.3rem; font-weight: 900; font-family: var(--font-display); }
    .gauge-bar-wrap { margin-bottom: 8px; }
    .gauge-bar-bg {
      height: 10px;
      background: rgba(255,255,255,0.07);
      border-radius: 999px;
      overflow: hidden;
    }
    .gauge-bar-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gauge-label-bottom {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .gauge-label-text {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .gauge-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* ── Aviso EV ── */
    .ev-warning {
      background: rgba(239, 68, 68, 0.07);
      border: 1px solid rgba(239, 68, 68, 0.18);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 14px;
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .ev-icon { flex-shrink: 0; font-size: 1rem; }

    /* ── Ranking de retorno ── */
    .return-ranking { display: flex; flex-direction: column; gap: 8px; }
    .ranking-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
      display: block;
    }
    .ranking-bars { display: flex; flex-direction: column; gap: 5px; }
    .rank-row {
      display: grid;
      grid-template-columns: 90px 1fr 36px;
      align-items: center;
      gap: 8px;
    }
    .rank-name {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rank-name.rank-current { color: #fff; font-weight: 800; }
    .rank-bar-wrap {
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .rank-bar {
      height: 100%;
      background: rgba(255,255,255,0.15);
      border-radius: 999px;
      transition: width 0.6s ease;
    }
    .rank-bar.rank-bar-current { background: linear-gradient(90deg, #10b981, #34d399); }
    .rank-pct {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-subtle);
      text-align: right;
    }
    .rank-pct.rank-current { color: #34d399; }

    /* ── Pares ── */
    .pairs-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    .pairs-list { display: flex; flex-direction: column; gap: 7px; }
    .pair-row {
      display: grid;
      grid-template-columns: 28px auto 1fr 36px 48px;
      align-items: center;
      gap: 10px;
    }
    .pair-rank {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-subtle);
    }
    .pair-balls {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pair-ball {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .pair-connector {
      font-size: 0.72rem;
      color: var(--text-subtle);
      font-weight: 700;
    }
    .pair-bar-wrap {
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .pair-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border-radius: 999px;
      transition: width 0.5s ease;
    }
    .pair-count {
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      text-align: right;
    }
    .pair-pct {
      font-size: 0.7rem;
      color: var(--text-subtle);
      text-align: right;
    }

    /* ── Responsivo ── */
    @media (max-width: 640px) {
      .roi-grid { grid-template-columns: 1fr; }
      .pairs-section { grid-column: auto; }
      .pair-row { grid-template-columns: 24px auto 1fr 32px; }
      .pair-pct { display: none; }
    }
  `]
})
export class RoiPanelComponent implements OnChanges {
  @Input() config!: LotteryConfig;
  @Input() draws: LotteryDraw[] = [];
  @Input() frequencies: NumberFrequency[] = [];
  @Input() bets: GeneratedBet[] = [];
  @Input() currentBetSize = 6;
  @Input() numberOfBets = 5;

  costTable: CostRow[] = [];
  costPerBet = 0;
  totalCost = 0;
  topPairs: PairFrequency[] = [];
  maxPairCount = 1;

  returnColor = '#10b981';
  returnGradient = 'linear-gradient(90deg, #10b981, #34d399)';
  returnLabel = 'Melhor retorno';

  returnRanking = [
    { id: 'federal',       shortName: 'Federal',       rate: 72 },
    { id: 'lotofacil',     shortName: 'Lotofácil',     rate: 71 },
    { id: 'quina',         shortName: 'Quina',         rate: 64 },
    { id: 'diadesorte',    shortName: 'Dia de Sorte',  rate: 64 },
    { id: 'lotomania',     shortName: 'Lotomania',     rate: 55 },
    { id: 'duplasena',     shortName: 'Dupla Sena',    rate: 50 },
    { id: 'timemania',     shortName: 'Timemania',     rate: 46 },
    { id: 'maismilionaria',shortName: '+Milionária',   rate: 45 },
    { id: 'megasena',      shortName: 'Mega-Sena',     rate: 43 },
    { id: 'supersete',     shortName: 'Super Sete',    rate: 40 },
  ];

  constructor(
    public calc: BetCalculatorService,
    private statsEngine: StatsEngineService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.config) {
      this.buildCostTable();
      this.updateReturnStyle();
    }
    if ((changes['draws'] || changes['frequencies']) && this.draws.length > 0 && this.config) {
      this.topPairs = this.statsEngine.calculateTopPairs(this.draws, this.config, 12);
      this.maxPairCount = this.topPairs.length > 0 ? this.topPairs[0].count : 1;
    }
  }

  private buildCostTable(): void {
    this.costTable = this.config.allowedBetCounts.map(count => ({
      count,
      combs: this.calc.combinations(count, this.config.defaultBetCount),
      cost: this.calc.getBetCost(this.config, count),
      isSelected: count === this.currentBetSize
    }));
    this.costPerBet = this.calc.getBetCost(this.config, this.currentBetSize);
    this.totalCost = this.costPerBet * this.numberOfBets;
  }

  private updateReturnStyle(): void {
    this.returnColor   = this.calc.getReturnRateColor(this.config.returnRate);
    this.returnLabel   = this.calc.getReturnRateLabel(this.config.returnRate);
    const c = this.returnColor;
    this.returnGradient = `linear-gradient(90deg, ${c}cc, ${c})`;
  }

  getPairBarWidth(count: number): number {
    return (count / this.maxPairCount) * 100;
  }

  trackByCount(_: number, row: CostRow): number { return row.count; }
  trackByLottery(_: number, item: any): string { return item.id; }
  trackByPair(_: number, p: PairFrequency): string { return `${p.a}|${p.b}`; }
}
