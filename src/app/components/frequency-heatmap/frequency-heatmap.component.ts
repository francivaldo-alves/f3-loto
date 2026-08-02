import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotteryConfig, NumberFrequency } from '../../models/lottery.model';

@Component({
  selector: 'app-frequency-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="heatmap-container glass-panel">

      <!-- Header -->
      <div class="heatmap-header">
        <div class="header-title-box" (click)="toggleCollapse()" style="cursor: pointer; user-select: none;">
          <h3 class="title">
            📊 Mapa de Frequência
            <span class="btn-collapse-toggle">{{ isCollapsed ? '➕ expandir' : '➖ recolher' }}</span>
          </h3>
          <p class="subtitle">
            <strong>{{ totalDraws }}</strong> sorteios analisados da {{ config.name }}
          </p>
        </div>

        <div class="header-controls" *ngIf="!isCollapsed">
          <div class="sample-picker">
            <span class="sample-label">Período:</span>
            <select class="sample-select" [ngModel]="selectedLimit" (ngModelChange)="onLimitChange($event)">
              <option [value]="50">Últimos 50</option>
              <option [value]="100">Últimos 100</option>
              <option [value]="200">Últimos 200 ✓</option>
              <option [value]="0">Histórico Completo</option>
            </select>
          </div>
        </div>
      </div>

      <ng-container *ngIf="!isCollapsed">
        <!-- Cards de resumo compactos -->
        <div class="stats-summary-grid">
          <div class="stat-card hot-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <span class="stat-label">Mais sorteadas</span>
              <div class="stat-balls">
                <span *ngFor="let item of topHot; trackBy: trackByFreq" class="mini-ball hot">
                  {{ item.number }}<em>{{ item.count }}x</em>
                </span>
              </div>
            </div>
          </div>

          <div class="stat-card trend-card">
            <div class="stat-icon">⬆️</div>
            <div class="stat-content">
              <span class="stat-label">Em alta recente</span>
              <div class="stat-balls">
                <span *ngFor="let item of topTrending; trackBy: trackByFreq" class="mini-ball trend">
                  {{ item.number }}<em>+{{ item.trendScore | number:'1.0-0' }}%</em>
                </span>
              </div>
            </div>
          </div>

          <div class="stat-card delayed-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <span class="stat-label">Mais atrasadas</span>
              <div class="stat-balls">
                <span *ngFor="let item of topDelayed; trackBy: trackByFreq" class="mini-ball delayed">
                  {{ item.number }}<em>{{ item.delay }}c</em>
                </span>
              </div>
            </div>
          </div>

          <div class="stat-card ratio-card" *ngIf="evenOddStats">
            <div class="stat-icon">⚖️</div>
            <div class="stat-content">
              <span class="stat-label">Par / Ímpar médio</span>
              <div class="ratio-values">
                <span class="ratio-chip even">{{ evenOddStats.avgEvens }} pares</span>
                <span class="ratio-chip odd">{{ evenOddStats.avgOdds }} ímpares</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Instrução interativa -->
        <div class="instruction-banner">
          <span class="inst-icon">👆</span>
          <span>Toque em uma dezena para <strong>fixá-la</strong> na aposta ou <strong>excluí-la</strong> do sorteio.</span>
        </div>

        <!-- Legenda das cores -->
        <div class="legend-row">
          <div class="legend-item"><span class="leg-dot hot"></span>Quente</div>
          <div class="legend-item"><span class="leg-dot trend"></span>Em alta</div>
          <div class="legend-item"><span class="leg-dot delayed"></span>Atrasada</div>
          <div class="legend-item"><span class="leg-dot cold"></span>Fria</div>
          <div class="legend-item"><span class="leg-dot normal"></span>Normal</div>
          <div class="legend-item fixed-item"><span class="leg-pin">📌</span>Fixada</div>
          <div class="legend-item excl-item"><span class="leg-pin">🚫</span>Excluída</div>
        </div>

        <!-- Grade de Dezenas -->
        <div class="balls-matrix">
          <div
            *ngFor="let freq of frequencies; trackBy: trackByFreq"
            class="matrix-cell"
            [class.is-fixed]="isFixed(freq.number)"
            [class.is-excluded]="isExcluded(freq.number)"
            [title]="getCellTooltip(freq)"
            (click)="onToggleNumber(freq.number)">

            <div
              class="loto-ball"
              [class.hot-glow]="freq.isHot && !freq.isTrending"
              [class.trend-glow]="freq.isTrending"
              [class.cold-style]="freq.isCold && !freq.isHot && !freq.isTrending"
              [class.delayed-style]="freq.isDelayed && !freq.isHot && !freq.isTrending"
              [style.--ball-color]="getBallColor(freq)"
              [style.--ball-dark-color]="config.secondaryColor">
              {{ freq.number }}
            </div>

            <!-- Mini badge de tendência -->
            <div class="trend-badge" *ngIf="freq.isTrending && !isFixed(freq.number) && !isExcluded(freq.number)">⬆</div>

            <div class="cell-stats">
              <span class="count-txt">{{ freq.count }}×</span>
              <span class="delay-txt" [class.high-delay]="freq.delay > 10">{{ freq.delay }}c</span>
            </div>

            <!-- Overlay de fixada/excluída -->
            <div class="badge-overlay" *ngIf="isFixed(freq.number)">📌 FIXA</div>
            <div class="badge-overlay excluded" *ngIf="isExcluded(freq.number)">🚫</div>
          </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .heatmap-container {
      padding: 20px;
      margin-bottom: 20px;
      border-radius: var(--radius-lg);
    }

    /* ── Header ── */
    .heatmap-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
    }
    .btn-collapse-toggle {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 10px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s ease;
    }
    .header-title-box:hover .btn-collapse-toggle {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    .subtitle {
      font-size: 0.83rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .sample-picker {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0,0,0,0.3);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .sample-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 700;
    }
    .sample-select {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 700;
      outline: none;
      cursor: pointer;
    }
    .sample-select option { background: #0f172a; }

    /* ── Stats Grid ── */
    .stats-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat-card {
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .stat-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
    .stat-content { display: flex; flex-direction: column; gap: 5px; }
    .stat-label {
      font-size: 0.7rem;
      color: var(--text-subtle);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-balls { display: flex; flex-wrap: wrap; gap: 4px; }
    .mini-ball {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .mini-ball em { font-style: normal; font-weight: 500; opacity: 0.75; font-size: 0.65rem; }
    .mini-ball.hot     { background: rgba(239,68,68,0.2);   color: #fca5a5; }
    .mini-ball.trend   { background: rgba(52,211,153,0.2);  color: #6ee7b7; }
    .mini-ball.delayed { background: rgba(245,158,11,0.2);  color: #fde047; }
    .mini-ball.cold    { background: rgba(59,130,246,0.2);  color: #93c5fd; }

    .ratio-values { display: flex; gap: 6px; flex-wrap: wrap; }
    .ratio-chip {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 5px;
    }
    .ratio-chip.even { background: rgba(99,102,241,0.2); color: #a5b4fc; }
    .ratio-chip.odd  { background: rgba(236,72,153,0.2); color: #f9a8d4; }

    /* ── Instrução ── */
    .instruction-banner {
      background: rgba(59,130,246,0.07);
      border: 1px solid rgba(59,130,246,0.18);
      color: #93c5fd;
      padding: 9px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inst-icon { font-size: 1rem; flex-shrink: 0; }

    /* ── Legenda ── */
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.73rem;
      color: var(--text-muted);
    }
    .leg-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .leg-dot.hot     { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .leg-dot.trend   { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .leg-dot.delayed { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .leg-dot.cold    { background: #3b82f6; box-shadow: 0 0 6px #3b82f6; }
    .leg-dot.normal  { background: #64748b; }
    .leg-pin { font-size: 0.85rem; }

    /* ── Matrix de Bolas ── */
    .balls-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
      gap: 8px;
    }
    .matrix-cell {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--radius-sm);
      padding: 7px 4px 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      position: relative;
      transition: all 0.18s ease;
      user-select: none;
    }
    .matrix-cell:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-2px);
      border-color: rgba(255,255,255,0.18);
    }
    .matrix-cell:active { transform: scale(0.95); }
    .matrix-cell.is-fixed {
      border-color: #10b981;
      background: rgba(16,185,129,0.12);
      box-shadow: 0 0 12px rgba(16,185,129,0.2);
    }
    .matrix-cell.is-excluded {
      border-color: #ef4444;
      background: rgba(239,68,68,0.1);
      opacity: 0.55;
    }

    /* Glows das bolas */
    .loto-ball.hot-glow {
      box-shadow: inset -3px -4px 6px rgba(0,0,0,0.5),
                  inset 2px 3px 4px rgba(255,255,255,0.8),
                  0 0 14px rgba(239,68,68,0.65);
    }
    .loto-ball.trend-glow {
      box-shadow: inset -3px -4px 6px rgba(0,0,0,0.5),
                  inset 2px 3px 4px rgba(255,255,255,0.8),
                  0 0 14px rgba(16,185,129,0.65);
    }
    .loto-ball.delayed-style {
      box-shadow: inset -3px -4px 6px rgba(0,0,0,0.5),
                  inset 2px 3px 4px rgba(255,255,255,0.8),
                  0 0 10px rgba(245,158,11,0.4);
    }
    .loto-ball.cold-style {
      opacity: 0.7;
    }

    /* Badge de tendência ⬆ */
    .trend-badge {
      position: absolute;
      top: -5px;
      left: -3px;
      font-size: 0.6rem;
      background: #10b981;
      color: #000;
      font-weight: 800;
      width: 14px; height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .cell-stats {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.1;
    }
    .count-txt {
      font-size: 0.68rem;
      font-weight: 700;
      color: #ffffff;
    }
    .delay-txt {
      font-size: 0.6rem;
      color: var(--text-subtle);
    }
    .delay-txt.high-delay { color: #f59e0b; }

    /* Overlays fixada/excluída */
    .badge-overlay {
      position: absolute;
      top: -7px; right: -4px;
      background: #10b981;
      color: #000;
      font-size: 0.52rem;
      font-weight: 800;
      padding: 2px 4px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .badge-overlay.excluded {
      background: #ef4444;
      color: #fff;
      font-size: 0.65rem;
      padding: 1px 3px;
    }

    @media (max-width: 576px) {
      .heatmap-container { padding: 14px 10px; }
      .title { font-size: 1.1rem; }
      .balls-matrix {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 6px;
      }
    }
  `]
})
export class FrequencyHeatmapComponent implements OnChanges {
  @Input() config!: LotteryConfig;
  @Input() frequencies: NumberFrequency[] = [];
  @Input() totalDraws = 0;
  @Input() fixedNumbers: string[] = [];
  @Input() excludedNumbers: string[] = [];
  @Input() evenOddStats: any = null;
  @Input() selectedLimit = 200;

  isCollapsed = false;

  @Output() limitChange = new EventEmitter<number>();
  @Output() toggleFixed = new EventEmitter<string>();
  @Output() toggleExcluded = new EventEmitter<string>();

  topHot: NumberFrequency[] = [];
  topCold: NumberFrequency[] = [];
  topDelayed: NumberFrequency[] = [];
  topTrending: NumberFrequency[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['frequencies'] && this.frequencies) {
      this.computeTopStats();
    }
  }

  private computeTopStats(): void {
    const list = [...this.frequencies];
    this.topHot     = [...list].sort((a, b) => b.count - a.count).slice(0, 5);
    this.topCold    = [...list].sort((a, b) => a.count - b.count).slice(0, 5);
    this.topDelayed = [...list].sort((a, b) => b.delay - a.delay).slice(0, 5);
    this.topTrending = [...list]
      .filter(f => (f.trendScore ?? 0) > 0)
      .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
      .slice(0, 5);
  }

  trackByFreq(index: number, item: NumberFrequency): string {
    return item.number;
  }

  getBallColor(freq: NumberFrequency): string {
    if (freq.isTrending) return '#059669';
    if (freq.isHot)      return '#dc2626';
    if (freq.isDelayed)  return '#d97706';
    if (freq.isCold)     return '#2563eb';
    return this.config?.color || '#475569';
  }

  getCellTooltip(freq: NumberFrequency): string {
    const parts: string[] = [`Dezena ${freq.number}`];
    parts.push(`Sorteada ${freq.count}x (${freq.percentage}%)`);
    parts.push(`Atraso: ${freq.delay} concursos`);
    if ((freq.trendScore ?? 0) > 0)  parts.push(`Tendência: +${freq.trendScore?.toFixed(0)}% vs média`);
    if (freq.isHot)     parts.push('🔥 Dezena quente');
    if (freq.isTrending) parts.push('⬆️ Em alta recente');
    if (freq.isDelayed) parts.push('⏳ Atrasada');
    if (freq.isCold)    parts.push('❄️ Dezena fria');
    return parts.join('\n');
  }

  isFixed(num: string): boolean {
    return this.fixedNumbers.includes(num);
  }

  isExcluded(num: string): boolean {
    return this.excludedNumbers.includes(num);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(Number(limit));
  }

  onToggleNumber(num: string): void {
    if (this.isFixed(num)) {
      // Fixada → vai para excluída
      this.toggleFixed.emit(num);
      this.toggleExcluded.emit(num);
    } else if (this.isExcluded(num)) {
      // Excluída → volta ao normal
      this.toggleExcluded.emit(num);
    } else {
      // Normal → fixada
      this.toggleFixed.emit(num);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
