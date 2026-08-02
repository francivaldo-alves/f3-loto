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
      <div class="heatmap-header">
        <div class="header-title-box">
          <h3 class="title">Painel de Frequência das Dezenas</h3>
          <p class="subtitle">
            Análise estatística dos últimos <strong>{{ totalDraws }}</strong> sorteios da {{ config.name }}.
          </p>
        </div>

        <div class="header-controls">
          <div class="sample-picker">
            <span class="sample-label">Amostra:</span>
            <select class="sample-select" [ngModel]="selectedLimit" (ngModelChange)="onLimitChange($event)">
              <option [value]="50">Últimos 50 Concursos</option>
              <option [value]="100">Últimos 100 Concursos</option>
              <option [value]="200">Últimos 200 Concursos (Recomendado)</option>
              <option [value]="0">Histórico Completo</option>
            </select>
          </div>

          <div class="legend-bar">
            <div class="legend-item"><span class="dot hot"></span> Mais Sorteadas</div>
            <div class="legend-item"><span class="dot delayed"></span> Mais Atrasadas</div>
            <div class="legend-item"><span class="dot cold"></span> Menos Sorteadas</div>
          </div>
        </div>
      </div>

      <!-- Resumo Estatístico -->
      <div class="stats-summary-grid">
        <div class="stat-card hot-card">
          <span class="stat-badge hot">HOT</span>
          <div class="stat-content">
            <span class="stat-label">Top 5 Dezenas mais Sorteadas</span>
            <div class="stat-balls">
              <span *ngFor="let item of topHot; trackBy: trackByFreq" class="mini-ball hot">{{ item.number }} ({{ item.count }}x)</span>
            </div>
          </div>
        </div>

        <div class="stat-card delayed-card">
          <span class="stat-badge delayed">ATRASO</span>
          <div class="stat-content">
            <span class="stat-label">Top 5 Dezenas mais Atrasadas</span>
            <div class="stat-balls">
              <span *ngFor="let item of topDelayed; trackBy: trackByFreq" class="mini-ball delayed">{{ item.number }} ({{ item.delay }} conc)</span>
            </div>
          </div>
        </div>

        <div class="stat-card cold-card">
          <span class="stat-badge cold">FRIO</span>
          <div class="stat-content">
            <span class="stat-label">Top 5 Dezenas menos Sorteadas</span>
            <div class="stat-balls">
              <span *ngFor="let item of topCold; trackBy: trackByFreq" class="mini-ball cold">{{ item.number }} ({{ item.count }}x)</span>
            </div>
          </div>
        </div>

        <div class="stat-card ratio-card" *ngIf="evenOddStats">
          <span class="stat-badge ratio">PAR/ÍMPAR</span>
          <div class="stat-content">
            <span class="stat-label">Média Histórica</span>
            <div class="ratio-values">
              <span><strong>{{ evenOddStats.avgEvens }}</strong> Pares</span>
              <span>•</span>
              <span><strong>{{ evenOddStats.avgOdds }}</strong> Ímpares</span>
            </div>
          </div>
        </div>
      </div>

      <div class="instruction-banner">
        Clique em uma dezena abaixo para alternar entre <strong>Fixar (📌)</strong> ou <strong>Excluir (🚫)</strong> na sua próxima aposta.
      </div>

      <!-- Grade Visual Matrix com 54px para caber perfeitamente em celulares -->
      <div class="balls-matrix">
        <div
          *ngFor="let freq of frequencies; trackBy: trackByFreq"
          class="matrix-cell"
          [class.is-fixed]="isFixed(freq.number)"
          [class.is-excluded]="isExcluded(freq.number)"
          (click)="onToggleNumber(freq.number)">
          
          <div
            class="loto-ball"
            [class.hot-glow]="freq.isHot"
            [class.cold-style]="freq.isCold"
            [style.--ball-color]="getBallColor(freq)"
            [style.--ball-dark-color]="config.secondaryColor">
            {{ freq.number }}
          </div>

          <div class="cell-stats">
            <span class="count-txt">{{ freq.count }}x</span>
            <span class="delay-txt">Atraso: {{ freq.delay }}</span>
          </div>

          <div class="badge-overlay" *ngIf="isFixed(freq.number)">FIXA</div>
          <div class="badge-overlay excluded" *ngIf="isExcluded(freq.number)">EXCLUÍDA</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .heatmap-container {
      padding: 20px;
      margin-bottom: 20px;
      border-radius: var(--radius-lg);
    }
    .heatmap-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 14px;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
    }
    .subtitle {
      font-size: 0.84rem;
      color: var(--text-muted);
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .sample-picker {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.25);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sample-label {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 700;
    }
    .sample-select {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      outline: none;
      cursor: pointer;
    }
    .sample-select option {
      background: #0f172a;
      color: #ffffff;
    }
    .legend-bar {
      display: flex;
      gap: 12px;
      background: rgba(0, 0, 0, 0.25);
      padding: 8px 12px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot.hot { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
    .dot.delayed { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .dot.cold { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

    .stats-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .stat-card {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-badge {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .stat-badge.hot { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .stat-badge.delayed { background: rgba(245, 158, 11, 0.2); color: #fde047; }
    .stat-badge.cold { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .stat-badge.ratio { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 0.72rem;
      color: var(--text-subtle);
      font-weight: 700;
      text-transform: uppercase;
    }
    .stat-balls {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .mini-ball {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
    }
    .mini-ball.hot { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .mini-ball.delayed { background: rgba(245, 158, 11, 0.2); color: #fde047; }
    .mini-ball.cold { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }

    .ratio-values {
      font-size: 0.85rem;
      color: #ffffff;
      display: flex;
      gap: 6px;
    }

    .instruction-banner {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
      color: #93c5fd;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      margin-bottom: 18px;
    }

    .balls-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
      gap: 8px;
    }
    .matrix-cell {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-sm);
      padding: 6px 2px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    .matrix-cell:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }
    .matrix-cell.is-fixed {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.15);
    }
    .matrix-cell.is-excluded {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      opacity: 0.6;
    }

    .cell-stats {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.1;
    }
    .count-txt {
      font-size: 0.7rem;
      font-weight: 700;
      color: #ffffff;
    }
    .delay-txt {
      font-size: 0.62rem;
      color: var(--text-subtle);
    }

    .badge-overlay {
      position: absolute;
      top: -6px;
      right: -4px;
      background: #10b981;
      color: #000;
      font-size: 0.55rem;
      font-weight: 800;
      padding: 1px 3px;
      border-radius: 4px;
    }
    .badge-overlay.excluded {
      background: #ef4444;
      color: #fff;
    }

    .loto-ball.hot-glow {
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
    }

    @media (max-width: 576px) {
      .heatmap-container {
        padding: 14px 10px;
      }
      .title {
        font-size: 1.15rem;
      }
      .balls-matrix {
        grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
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

  @Output() limitChange = new EventEmitter<number>();
  @Output() toggleFixed = new EventEmitter<string>();
  @Output() toggleExcluded = new EventEmitter<string>();

  topHot: NumberFrequency[] = [];
  topCold: NumberFrequency[] = [];
  topDelayed: NumberFrequency[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['frequencies'] && this.frequencies) {
      this.computeTopStats();
    }
  }

  private computeTopStats(): void {
    const list = [...this.frequencies];
    this.topHot = list.sort((a, b) => b.count - a.count).slice(0, 5);
    
    const coldList = [...this.frequencies];
    this.topCold = coldList.sort((a, b) => a.count - b.count).slice(0, 5);
    
    const delayedList = [...this.frequencies];
    this.topDelayed = delayedList.sort((a, b) => b.delay - a.delay).slice(0, 5);
  }

  trackByFreq(index: number, item: NumberFrequency): string {
    return item.number;
  }

  getBallColor(freq: NumberFrequency): string {
    if (freq.isHot) return '#dc2626';
    if (freq.isDelayed) return '#d97706';
    if (freq.isCold) return '#2563eb';
    return this.config.color || '#475569';
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
      this.toggleFixed.emit(num);
      this.toggleExcluded.emit(num);
    } else if (this.isExcluded(num)) {
      this.toggleExcluded.emit(num);
    } else {
      this.toggleFixed.emit(num);
    }
  }
}
