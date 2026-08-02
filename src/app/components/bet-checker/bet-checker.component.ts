import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotteryConfig, LotteryDraw } from '../../models/lottery.model';

interface CheckResult {
  concurso: number;
  data: string;
  hitsCount: number;
  matchedNumbers: string[];
  drawNumbers: string[];
}

@Component({
  selector: 'app-bet-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="checker-container glass-panel">

      <!-- Cabeçalho -->
      <div class="checker-header">
        <span class="chk-icon">🔍</span>
        <div>
          <h3 class="chk-title">Conferidor de Apostas</h3>
          <p class="chk-subtitle">Teste seus números contra o histórico real de sorteios da <strong>{{ config.name }}</strong>.</p>
        </div>
      </div>

      <div class="checker-grid">

        <!-- Seleção de números -->
        <div class="selector-side">
          <label class="section-label">1. Escolha seus números no volante</label>
          <p class="select-help">
            Selecione de <strong>{{ config.defaultBetCount }}</strong> a <strong>{{ getMaxSelectable() }}</strong> dezenas.
            Você selecionou: <strong>{{ selectedNumbers.length }}</strong> dezenas.
          </p>

          <!-- Volante para clicar -->
          <div class="chk-volante">
            <button
              *ngFor="let num of volanteNumbers; trackBy: trackByNum"
              class="chk-cell"
              [class.active]="isSelected(num)"
              [style.--active-color]="config.color"
              (click)="toggleNumber(num)">
              {{ num }}
            </button>
          </div>

          <!-- Input de texto como alternativa rápida -->
          <div class="text-input-row">
            <label class="config-label">Ou cole números separados por traço ou espaço:</label>
            <div class="input-wrap">
              <input
                type="text"
                class="text-input"
                placeholder="Ex: 05 - 12 - 23 - 34 - 45 - 56"
                [(ngModel)]="manualInput"
                (keyup.enter)="parseManualInput()">
              <button class="btn-parse" (click)="parseManualInput()">Aplicar</button>
            </div>
            <span class="error-msg" *ngIf="parseError">{{ parseError }}</span>
          </div>

          <div class="buttons-row">
            <button class="btn-clear" (click)="clearSelection()">Limpar Tudo</button>
            <button
              class="btn-run"
              [disabled]="selectedNumbers.length < config.defaultBetCount"
              (click)="runChecker()">
              Conferir Aposta ⚡
            </button>
          </div>
        </div>

        <!-- Painel de Resultados -->
        <div class="results-side">
          <label class="section-label">2. Resultado da conferência</label>

          <!-- Estado inicial/instruções -->
          <div class="results-empty" *ngIf="!hasChecked">
            <span class="empty-icon">📊</span>
            <p>Selecione pelo menos <strong>{{ config.defaultBetCount }}</strong> números e clique em "Conferir Aposta" para ver as estatísticas de premiações históricas.</p>
          </div>

          <!-- Estatísticas pós conferência -->
          <div class="results-wrap" *ngIf="hasChecked">
            <div class="summary-cards">
              <div class="summary-card total">
                <span class="card-num">{{ history.length }}</span>
                <span class="card-label">Sorteios Analisados</span>
              </div>
              <div class="summary-card best">
                <span class="card-num" [style.color]="config.color">{{ bestHit }}</span>
                <span class="card-label">Máximo de Acertos</span>
              </div>
              <div class="summary-card prizes">
                <span class="card-num positive">{{ prizeHitsCount }}</span>
                <span class="card-label">Faixas de Premiação</span>
              </div>
            </div>

            <!-- Distribuição das premiações -->
            <div class="prize-stats">
              <h5 class="sub-section-title">Resumo por faixas:</h5>
              <div class="prize-rows">
                <div *ngFor="let row of prizeDistribution; trackBy: trackByPrizeRow" class="prize-stat-row">
                  <span class="prize-name">{{ row.hits }} Acertos</span>
                  <div class="prize-progress-wrap">
                    <div class="prize-progress" [style.width.%]="getPrizeProgressWidth(row.count)" [style.background-color]="config.color"></div>
                  </div>
                  <span class="prize-count" [class.winner]="row.count > 0">{{ row.count }}×</span>
                </div>
              </div>
            </div>

            <!-- Detalhamento dos acertos -->
            <div class="details-section">
              <h5 class="sub-section-title">Sorteios premiados encontrados:</h5>

              <div class="details-empty" *ngIf="prizeDraws.length === 0">
                Essa aposta não teria recebido nenhuma premiação nos últimos {{ history.length }} concursos.
              </div>

              <div class="details-list" *ngIf="prizeDraws.length > 0">
                <div *ngFor="let item of prizeDraws; trackBy: trackByConcurso" class="detail-item">
                  <div class="item-header">
                    <span class="item-concurso">Concurso #{{ item.concurso }}</span>
                    <span class="item-date">{{ item.data }}</span>
                    <span class="item-hits-badge" [style.background-color]="config.color">{{ item.hitsCount }} acertos</span>
                  </div>
                  <div class="item-balls-row">
                    <span
                      *ngFor="let ball of item.drawNumbers; trackBy: trackByNum"
                      class="mini-draw-ball"
                      [class.hit]="item.matchedNumbers.includes(ball)"
                      [style.--h-color]="config.color">
                      {{ ball }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .checker-container {
      padding: 22px;
      margin-bottom: 24px;
      border-radius: var(--radius-lg);
    }

    /* ── Header ── */
    .checker-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }
    .chk-icon { font-size: 1.6rem; flex-shrink: 0; }
    .chk-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
    }
    .chk-subtitle { font-size: 0.83rem; color: var(--text-muted); margin-top: 3px; }

    /* ── Grid ── */
    .checker-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 20px;
    }

    .section-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .select-help {
      font-size: 0.78rem;
      color: var(--text-subtle);
      margin-bottom: 12px;
    }

    /* ── Volante de seleção ── */
    .chk-volante {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      background: rgba(0,0,0,0.2);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      margin-bottom: 14px;
    }
    .chk-cell {
      aspect-ratio: 1;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      color: var(--text-muted);
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      user-select: none;
    }
    .chk-cell:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }
    .chk-cell.active {
      background: var(--active-color, #10b981);
      color: #000000;
      border-color: transparent;
      font-weight: 900;
      box-shadow: 0 0 8px var(--active-color, rgba(16,185,129,0.45));
    }

    /* ── Texto Input ── */
    .text-input-row {
      margin-bottom: 16px;
    }
    .config-label {
      display: block;
      font-size: 0.73rem;
      font-weight: 700;
      color: var(--text-subtle);
      margin-bottom: 6px;
    }
    .input-wrap {
      display: flex;
      gap: 6px;
    }
    .text-input {
      flex: 1;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-sm);
      color: #fff;
      padding: 7px 12px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      outline: none;
    }
    .text-input:focus {
      border-color: rgba(255,255,255,0.22);
    }
    .btn-parse {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #fff;
      border-radius: var(--radius-sm);
      padding: 0 14px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-parse:hover { background: rgba(255,255,255,0.12); }
    .error-msg { font-size: 0.72rem; color: #ef4444; margin-top: 4px; display: block; }

    .buttons-row {
      display: flex;
      gap: 8px;
    }
    .btn-clear {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.09);
      color: var(--text-muted);
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-clear:hover { background: rgba(255,255,255,0.04); color: #fff; }
    .btn-run {
      flex: 1;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 0.88rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    }
    .btn-run:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(59, 130, 246, 0.4);
    }
    .btn-run:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ── Resultados ── */
    .results-empty {
      background: rgba(0,0,0,0.18);
      border: 1px dashed rgba(255,255,255,0.08);
      border-radius: var(--radius-md);
      padding: 40px 24px;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon { font-size: 2rem; opacity: 0.5; }
    .results-empty p { font-size: 0.85rem; line-height: 1.5; max-width: 280px; }

    .results-wrap {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .summary-card {
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .card-num {
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 900;
      color: #fff;
    }
    .card-num.positive { color: #10b981; }
    .card-label {
      font-size: 0.65rem;
      color: var(--text-subtle);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;
      text-align: center;
    }

    .sub-section-title {
      font-size: 0.78rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Faixas de acertos */
    .prize-rows {
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(0,0,0,0.15);
      padding: 10px 12px;
      border-radius: 8px;
    }
    .prize-stat-row {
      display: grid;
      grid-template-columns: 80px 1fr 30px;
      align-items: center;
      gap: 8px;
    }
    .prize-name { font-size: 0.78rem; color: var(--text-muted); }
    .prize-progress-wrap {
      height: 6px;
      background: rgba(255,255,255,0.05);
      border-radius: 999px;
      overflow: hidden;
    }
    .prize-progress {
      height: 100%;
      border-radius: 999px;
      transition: width 0.5s ease;
    }
    .prize-count {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-subtle);
      text-align: right;
    }
    .prize-count.winner { color: #10b981; }

    /* Detalhamento */
    .details-section {
      background: rgba(0,0,0,0.18);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      padding: 12px;
    }
    .details-empty { font-size: 0.78rem; color: var(--text-subtle); text-align: center; padding: 12px 0; }
    .details-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 180px;
      overflow-y: auto;
      padding-right: 4px;
    }
    /* Estilo scrollbar */
    .details-list::-webkit-scrollbar { width: 5px; }
    .details-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .details-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 999px; }

    .detail-item {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 6px;
      padding: 8px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .item-concurso { font-size: 0.75rem; font-weight: 800; color: #fff; }
    .item-date { font-size: 0.68rem; color: var(--text-subtle); }
    .item-hits-badge {
      font-size: 0.65rem;
      font-weight: 800;
      color: #000;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .item-balls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .mini-draw-ball {
      width: 22px;
      height: 22px;
      background: rgba(255,255,255,0.07);
      color: var(--text-muted);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
    }
    .mini-draw-ball.hit {
      background-color: var(--h-color, #10b981);
      color: #000000;
      font-weight: 900;
      box-shadow: 0 0 6px var(--h-color, rgba(16,185,129,0.45));
    }

    @media (max-width: 768px) {
      .checker-grid { grid-template-columns: 1fr; }
      .chk-volante { gap: 2px; }
      .chk-cell { font-size: 0.65rem; }
    }
  `]
})
export class BetCheckerComponent implements OnChanges {
  @Input() config!: LotteryConfig;
  @Input() history: LotteryDraw[] = [];

  volanteNumbers: string[] = [];
  selectedNumbers: string[] = [];

  manualInput = '';
  parseError: string | null = null;

  hasChecked = false;
  bestHit = 0;
  prizeHitsCount = 0;
  prizeDraws: CheckResult[] = [];
  prizeDistribution: { hits: number; count: number }[] = [];
  maxDistributionCount = 1;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.buildVolante();
      this.clearSelection();
    }
  }

  private buildVolante(): void {
    this.volanteNumbers = [];
    for (let i = this.config.minNumber; i <= this.config.maxNumber; i++) {
      this.volanteNumbers.push(String(i).padStart(this.config.numberPadding, '0'));
    }
  }

  getMaxSelectable(): number {
    if (!this.config?.allowedBetCounts?.length) return 15;
    return this.config.allowedBetCounts[this.config.allowedBetCounts.length - 1];
  }

  isSelected(num: string): boolean {
    return this.selectedNumbers.includes(num);
  }

  toggleNumber(num: string): void {
    const idx = this.selectedNumbers.indexOf(num);
    if (idx >= 0) {
      this.selectedNumbers.splice(idx, 1);
    } else {
      if (this.selectedNumbers.length >= this.getMaxSelectable()) {
        return;
      }
      this.selectedNumbers.push(num);
    }
    this.selectedNumbers.sort();
    this.updateManualInputText();
    this.hasChecked = false;
    this.cdr.markForCheck();
  }

  private updateManualInputText(): void {
    this.manualInput = this.selectedNumbers.join(' - ');
  }

  parseManualInput(): void {
    this.parseError = null;
    if (!this.manualInput.trim()) {
      this.clearSelection();
      return;
    }

    const cleanInput = this.manualInput.replace(/[,;.]/g, ' ');
    const tokens = cleanInput.split(/[\s\-]+/);
    const parsed: string[] = [];

    for (const token of tokens) {
      const cleanToken = token.trim();
      if (!cleanToken) continue;

      const numVal = parseInt(cleanToken, 10);
      if (isNaN(numVal) || numVal < this.config.minNumber || numVal > this.config.maxNumber) {
        this.parseError = `Número inválido: "${cleanToken}"`;
        return;
      }

      const formatted = String(numVal).padStart(this.config.numberPadding, '0');
      if (parsed.includes(formatted)) {
        continue;
      }
      parsed.push(formatted);
    }

    if (parsed.length < this.config.defaultBetCount) {
      this.parseError = `Escolha no mínimo ${this.config.defaultBetCount} números (você inseriu ${parsed.length})`;
      return;
    }

    const max = this.getMaxSelectable();
    if (parsed.length > max) {
      this.parseError = `Máximo de ${max} números excedido (você inseriu ${parsed.length})`;
      return;
    }

    parsed.sort();
    this.selectedNumbers = parsed;
    this.updateManualInputText();
    this.hasChecked = false;
    this.cdr.markForCheck();
  }

  clearSelection(): void {
    this.selectedNumbers = [];
    this.manualInput = '';
    this.parseError = null;
    this.hasChecked = false;
    this.cdr.markForCheck();
  }

  runChecker(): void {
    if (this.selectedNumbers.length < this.config.defaultBetCount) return;

    this.hasChecked = true;
    this.bestHit = 0;
    this.prizeHitsCount = 0;
    this.prizeDraws = [];

    // Inicializa a distribuição (ex: Lotofácil vai de 11 a 15, Mega-Sena de 4 a 6)
    const minHits = this.config.minHitsForPrize;
    const maxHits = this.config.defaultBetCount;
    const distMap: Map<number, number> = new Map();

    for (let h = minHits; h <= maxHits; h++) {
      distMap.set(h, 0);
    }

    this.history.forEach(draw => {
      const drawDezenas = draw.dezenas || [];
      const matched = this.selectedNumbers.filter(n => drawDezenas.includes(n));
      const hitsCount = matched.length;

      this.bestHit = Math.max(this.bestHit, hitsCount);

      if (hitsCount >= minHits) {
        this.prizeHitsCount++;
        
        // Registrar na distribuição
        if (hitsCount <= maxHits) {
          distMap.set(hitsCount, (distMap.get(hitsCount) || 0) + 1);
        }

        // Adicionar lista de sorteios premiados
        this.prizeDraws.push({
          concurso: draw.concurso,
          data: draw.data,
          hitsCount,
          matchedNumbers: matched,
          drawNumbers: drawDezenas
        });
      }
    });

    // Ordenar sorteios premiados: concursos mais recentes primeiro, priorizando mais acertos
    this.prizeDraws.sort((a, b) => {
      if (b.hitsCount !== a.hitsCount) {
        return b.hitsCount - a.hitsCount;
      }
      return b.concurso - a.concurso;
    });

    // Formatar distribuição para renderizar
    this.prizeDistribution = [];
    this.maxDistributionCount = 1;

    for (let h = minHits; h <= maxHits; h++) {
      const count = distMap.get(h) || 0;
      this.prizeDistribution.push({ hits: h, count });
      this.maxDistributionCount = Math.max(this.maxDistributionCount, count);
    }

    // Inverter para mostrar os maiores prêmios no topo (ex: Sena na primeira linha, Quadra na última)
    this.prizeDistribution.reverse();

    this.cdr.markForCheck();
  }

  getPrizeProgressWidth(count: number): number {
    if (count === 0) return 0;
    return (count / this.maxDistributionCount) * 100;
  }

  trackByNum(index: number, num: string): string { return num; }
  trackByPrizeRow(index: number, row: any): number { return row.hits; }
  trackByConcurso(index: number, item: CheckResult): number { return item.concurso; }
}
