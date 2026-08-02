import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LotteryConfig, LotteryDraw, LotteryType, LOTTERY_CONFIGS } from '../../models/lottery.model';

@Component({
  selector: 'app-lottery-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <div class="dashboard-hero">
        <h2 class="hero-title">Acompanhamento das Loterias da Caixa</h2>
        <p class="hero-desc">
          Selecione qualquer modalidade para verificar quais números estão saindo mais e gerar seus palpites otimizados por matemática estatística.
        </p>
      </div>

      <div class="cards-grid">
        <div
          *ngFor="let config of lotteryConfigs; trackBy: trackByConfig"
          class="lottery-card glass-panel"
          (click)="onSelectGame(config.id)">
          
          <div class="card-header" [style.background]="config.gradient">
            <div class="header-info">
              <span class="game-badge">{{ config.badge }}</span>
              <h3 class="game-name">{{ config.name }}</h3>
            </div>
            <span *ngIf="getDraw(config.id)?.acumulou" class="accumulated-pill">
              Acumulado
            </span>
          </div>

          <div class="card-body">
            <div class="contest-row" *ngIf="getDraw(config.id) as draw; else loadingState">
              <div class="contest-num">
                Concurso <strong>#{{ draw.concurso }}</strong> • {{ draw.data }}
              </div>
              
              <div class="jackpot-box">
                <span class="jackpot-label">Prêmio Estimado</span>
                <div class="jackpot-value">
                  {{ (draw.valorEstimadoProximoConcurso || 0) | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}
                </div>
                <div class="next-date" *ngIf="draw.dataProximoConcurso">
                  Próximo sorteio: {{ draw.dataProximoConcurso }}
                </div>
              </div>

              <!-- Dezenas Sorteadas -->
              <div class="numbers-section">
                <span class="section-label">Último Sorteio Realizado</span>
                <div class="balls-row">
                  <div
                    *ngFor="let num of (draw.dezenas || []).slice(0, 8); trackBy: trackByBall"
                    class="loto-ball sm"
                    [style.--ball-color]="config.color"
                    [style.--ball-dark-color]="config.secondaryColor">
                    {{ num }}
                  </div>
                  <span *ngIf="(draw.dezenas.length || 0) > 8" class="more-balls">
                    +{{ (draw.dezenas.length || 0) - 8 }}
                  </span>
                </div>

                <div *ngIf="draw.trevos && draw.trevos.length > 0" class="special-row">
                  <span class="special-label">Trevos da Sorte:</span>
                  <div class="balls-row">
                    <div *ngFor="let t of draw.trevos; trackBy: trackByBall" class="loto-ball sm trevo">
                      {{ t }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #loadingState>
              <div class="loading-placeholder">
                <div class="spinner"></div>
                <span>Carregando sorteio...</span>
              </div>
            </ng-template>
          </div>

          <div class="card-footer">
            <button class="btn-analyze">
              Abrir Estatísticas & Gerar Apostas →
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 0 12px 24px 12px;
    }
    .dashboard-hero {
      margin-bottom: 24px;
      text-align: center;
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .hero-desc {
      color: var(--text-muted);
      max-width: 660px;
      margin: 0 auto;
      font-size: 0.92rem;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }
    .lottery-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
    }
    .lottery-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    }
    .card-header {
      padding: 14px 18px;
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
      background: rgba(255, 255, 255, 0.22);
      padding: 4px 8px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.8rem;
      font-family: var(--font-display);
    }
    .game-name {
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 800;
    }
    .accumulated-pill {
      background: #ef4444;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-body {
      padding: 16px 18px;
      flex: 1;
    }
    .contest-num {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .jackpot-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      margin-bottom: 14px;
    }
    .jackpot-label {
      font-size: 0.72rem;
      color: var(--text-subtle);
      display: block;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .jackpot-value {
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--accent-gold);
    }
    .next-date {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .numbers-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-label {
      font-size: 0.75rem;
      color: var(--text-subtle);
      font-weight: 600;
    }
    .balls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .more-balls {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-left: 4px;
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
    .card-footer {
      padding: 10px 18px;
      background: rgba(0, 0, 0, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .btn-analyze {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .lottery-card:hover .btn-analyze {
      color: #34d399;
    }
    .loading-placeholder {
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: var(--text-subtle);
      font-size: 0.85rem;
    }
    .spinner {
      width: 22px;
      height: 22px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      .dashboard-container {
        padding: 0 6px 16px 6px;
      }
      .hero-title {
        font-size: 1.4rem;
      }
      .hero-desc {
        font-size: 0.85rem;
      }
      .cards-grid {
        grid-template-columns: 1fr;
      }
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
