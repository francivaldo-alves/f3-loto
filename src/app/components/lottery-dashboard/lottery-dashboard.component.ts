import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { LotteryConfig, LotteryDraw, LotteryType, LOTTERY_CONFIGS } from '../../models/lottery.model';

@Component({
  selector: 'app-lottery-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <div class="dashboard-hero">
        <div class="hero-badge">🎲 Loterias Caixa</div>
        <h2 class="hero-title">Qual loteria você quer analisar?</h2>
        <p class="hero-desc">
          Veja o resultado mais recente, o prêmio acumulado e gere seus palpites otimizados com análise estatística do histórico completo.
        </p>
      </div>

      <div class="cards-grid">
        <div
          *ngFor="let config of lotteryConfigs; trackBy: trackByConfig"
          class="lottery-card"
          (click)="onSelectGame(config.id)">

          <!-- Cabeçalho com gradiente -->
          <div class="card-header" [style.background]="config.gradient">
            <div class="header-info">
              <span class="game-badge">{{ config.badge }}</span>
              <h3 class="game-name">{{ config.name }}</h3>
            </div>
            <span *ngIf="getDraw(config.id)?.acumulou" class="accumulated-pill">
              🏆 Acumulado
            </span>
          </div>

          <div class="card-body">

            <!-- SKELETON: mostra enquanto dados chegam (seed já disponível, mas pode mudar) -->
            <ng-container *ngIf="getDraw(config.id) as draw; else skeletonTpl">

              <div class="contest-row">
                <span class="contest-icon">🎯</span>
                Concurso <strong>#{{ draw.concurso }}</strong> &bull; {{ draw.data }}
              </div>

              <div class="jackpot-box" [class.accumulated]="draw.acumulou">
                <span class="jackpot-label">{{ draw.acumulou ? '💰 Prêmio Acumulado' : '🎁 Prêmio Estimado' }}</span>
                <div class="jackpot-value">
                  {{ formatCurrency(draw.valorEstimadoProximoConcurso || 0) }}
                </div>
                <div class="next-date" *ngIf="draw.dataProximoConcurso">
                  📅 Próximo: {{ draw.dataProximoConcurso }}
                </div>
              </div>

              <div class="numbers-section">
                <span class="section-label">Último Sorteio</span>

                <!-- Loterica Federal: números de 5 dígitos → chip largo -->
                <div *ngIf="config.numberPadding >= 5; else normalBalls" class="federal-chips-row">
                  <div
                    *ngFor="let num of (draw.dezenas || []); trackBy: trackByBall"
                    class="federal-chip"
                    [style.border-color]="config.color"
                    [style.color]="config.color">
                    {{ num }}
                  </div>
                </div>

                <!-- Demais loterias: bolas normais -->
                <ng-template #normalBalls>
                  <div class="balls-row">
                    <div
                      *ngFor="let num of (draw.dezenas || []); trackBy: trackByBall"
                      class="loto-ball sm"
                      [style.--ball-color]="config.color"
                      [style.--ball-dark-color]="config.secondaryColor">
                      {{ num }}
                    </div>
                  </div>
                </ng-template>

                <div *ngIf="draw.trevos && draw.trevos.length > 0" class="special-row">
                  <span class="special-label">Trevos:</span>
                  <div class="balls-row">
                    <div *ngFor="let t of draw.trevos; trackBy: trackByBall" class="loto-ball sm trevo">{{ t }}</div>
                  </div>
                </div>
              </div>

            </ng-container>

            <!-- Skeleton shimmer enquanto os dados chegam -->
            <ng-template #skeletonTpl>
              <div class="skeleton-wrap">
                <div class="sk-row sk-short"></div>
                <div class="sk-block"></div>
                <div class="sk-row sk-label"></div>
                <div class="sk-balls-row">
                  <div class="sk-ball" *ngFor="let i of [1,2,3,4,5,6]"></div>
                </div>
              </div>
            </ng-template>
          </div>

          <div class="card-footer">
            <button class="btn-analyze">
              Ver Análise &amp; Gerar Apostas
              <span class="arrow">→</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 0 12px 32px 12px;
    }

    /* ── Hero ── */
    .dashboard-hero {
      margin-bottom: 28px;
      text-align: center;
      animation: fadeSlideUp 0.5s ease both;
    }
    .hero-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .hero-desc {
      color: var(--text-muted);
      max-width: 580px;
      margin: 0 auto;
      font-size: 0.93rem;
      line-height: 1.6;
    }

    /* ── Grid de Cards ── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
    }

    .lottery-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      border-radius: var(--radius-md);
      background: linear-gradient(145deg, rgba(22, 32, 54, 0.9) 0%, rgba(14, 21, 37, 0.95) 100%);
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.28s ease,
                  border-color 0.2s ease;
      animation: fadeSlideUp 0.4s ease both;
    }
    .lottery-card:nth-child(2) { animation-delay: 0.05s; }
    .lottery-card:nth-child(3) { animation-delay: 0.10s; }
    .lottery-card:nth-child(4) { animation-delay: 0.15s; }
    .lottery-card:nth-child(5) { animation-delay: 0.20s; }
    .lottery-card:nth-child(6) { animation-delay: 0.25s; }
    .lottery-card:nth-child(n+7) { animation-delay: 0.30s; }

    .lottery-card:hover {
      transform: translateY(-5px) scale(1.01);
      box-shadow: 0 20px 48px rgba(0,0,0,0.55);
      border-color: rgba(255,255,255,0.15);
    }

    /* ── Card Header ── */
    .card-header {
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffffff;
    }
    .header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .game-badge {
      background: rgba(255,255,255,0.22);
      padding: 4px 9px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.78rem;
      font-family: var(--font-display);
    }
    .game-name {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 800;
    }
    .accumulated-pill {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(239,68,68,0.4);
    }

    /* ── Card Body ── */
    .card-body {
      padding: 14px 18px;
      flex: 1;
    }
    .contest-row {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .contest-icon { font-size: 0.85rem; }

    .jackpot-box {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.06);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      margin-bottom: 14px;
      transition: border-color 0.2s ease;
    }
    .jackpot-box.accumulated {
      border-color: rgba(251, 191, 36, 0.2);
      background: rgba(251, 191, 36, 0.05);
    }
    .jackpot-label {
      font-size: 0.7rem;
      color: var(--text-subtle);
      display: block;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .jackpot-value {
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 900;
      color: var(--accent-gold);
      line-height: 1.1;
    }
    .next-date {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .numbers-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-label {
      font-size: 0.72rem;
      color: var(--text-subtle);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .balls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
    }
    .more-balls {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255,255,255,0.06);
      padding: 3px 7px;
      border-radius: 6px;
    }
    .special-row {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .special-label {
      font-size: 0.72rem;
      color: var(--accent-gold);
      font-weight: 700;
    }

    /* ── Chips para Loterica Federal (números de 5 dígitos) ── */
    .federal-chips-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .federal-chip {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 7px;
      border: 1px solid;
      background: rgba(0, 0, 0, 0.3);
      letter-spacing: 2px;
      text-align: center;
      transition: background 0.15s ease;
    }
    .lottery-card:hover .federal-chip {
      background: rgba(255, 255, 255, 0.05);
    }

    /* ── Card Footer ── */
    .card-footer {
      padding: 10px 18px;
      background: rgba(0,0,0,0.18);
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .btn-analyze {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      transition: color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .arrow {
      transition: transform 0.2s ease;
    }
    .lottery-card:hover .btn-analyze {
      color: #34d399;
    }
    .lottery-card:hover .arrow {
      transform: translateX(4px);
    }

    /* ── Skeleton Shimmer ── */
    .skeleton-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sk-row, .sk-block, .sk-ball {
      border-radius: 8px;
      background: linear-gradient(90deg,
        rgba(255,255,255,0.04) 0%,
        rgba(255,255,255,0.09) 40%,
        rgba(255,255,255,0.04) 80%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }
    .sk-short { height: 14px; width: 60%; }
    .sk-block { height: 64px; border-radius: var(--radius-sm); }
    .sk-label { height: 10px; width: 40%; }
    .sk-balls-row {
      display: flex;
      gap: 6px;
    }
    .sk-ball {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Animações ── */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Responsivo ── */
    @media (max-width: 480px) {
      .dashboard-container { padding: 0 6px 20px 6px; }
      .hero-title { font-size: 1.5rem; }
      .hero-desc { font-size: 0.85rem; }
      .cards-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class LotteryDashboardComponent {
  @Input() latestDraws: Map<LotteryType, LotteryDraw> = new Map();
  @Output() selectGame = new EventEmitter<LotteryType>();

  lotteryConfigs: LotteryConfig[] = Object.values(LOTTERY_CONFIGS);

  getDraw(id: LotteryType): LotteryDraw | undefined {
    return this.latestDraws.get(id);
  }

  formatCurrency(value: number): string {
    if (!value) return 'R$ —';
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} milhões`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  }

  trackByConfig(index: number, config: LotteryConfig): string {
    return config.id;
  }

  trackByBall(index: number, ball: string): string {
    return ball;
  }

  onSelectGame(id: LotteryType): void {
    this.selectGame.emit(id);
  }
}
