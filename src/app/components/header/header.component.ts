import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LotteryConfig, LotteryType, LOTTERY_CONFIGS } from '../../models/lottery.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header-container glass-panel">
      <div class="header-top">
        <div class="brand" (click)="selectGame(null)">
          <div class="logo-mark">
            <span class="logo-ball-mini">S</span>
          </div>
          <div class="brand-text">
            <h1 class="title">SortLoto <span class="badge-pro">PRO</span></h1>
            <p class="subtitle">Otimizador de Palpites & Análise Estatística da Caixa</p>
          </div>
        </div>

        <div class="status-badge" [class.syncing]="loading">
          <span class="dot"></span>
          <span class="txt">{{ loading ? 'Sincronizando...' : 'Caixa ao Vivo' }}</span>
        </div>
      </div>

      <!-- Navegação por Abas das Loterias com Rolagem Suave -->
      <nav class="lottery-tabs-scroll">
        <div class="tabs-wrapper">
          <button
            class="tab-btn"
            [class.active]="selectedGameId === null"
            (click)="selectGame(null)">
            <span class="tab-home-icon">✦</span>
            Todas as Loterias
          </button>

          <button
            *ngFor="let game of lotteryList; trackBy: trackByTab"
            class="tab-btn"
            [class.active]="selectedGameId === game.id"
            [style.--game-color]="game.color"
            (click)="selectGame(game.id)">
            <span class="game-badge" [style.background]="game.gradient">{{ game.badge }}</span>
            <span class="game-name">{{ game.shortName }}</span>
          </button>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .header-container {
      margin: 12px 12px 20px 12px;
      padding: 16px 20px;
      border-radius: var(--radius-lg);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .logo-mark {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
      flex-shrink: 0;
    }
    .logo-ball-mini {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 1.3rem;
      color: #ffffff;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-pro {
      font-size: 0.68rem;
      background: rgba(251, 191, 36, 0.15);
      color: var(--accent-gold);
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 800;
    }
    .subtitle {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
    }
    .status-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .status-badge.syncing .dot {
      background: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .status-badge .txt {
      color: var(--text-muted);
      font-weight: 600;
    }

    .lottery-tabs-scroll {
      overflow-x: auto;
      padding-bottom: 4px;
      -webkit-overflow-scrolling: touch;
    }
    .tabs-wrapper {
      display: flex;
      gap: 8px;
      min-width: max-content;
    }

    @media (min-width: 768px) {
      .lottery-tabs-scroll {
        overflow-x: visible;
      }
      .tabs-wrapper {
        flex-wrap: wrap;
        min-width: 100%;
      }
    }
    .tab-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .tab-btn.active {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--game-color, #3b82f6);
      color: #ffffff;
      box-shadow: 0 0 20px var(--game-color, rgba(59, 130, 246, 0.25));
    }
    .tab-home-icon {
      color: var(--accent-emerald);
      font-size: 0.9rem;
    }
    .game-badge {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 800;
      color: #ffffff;
    }

    @media (max-width: 640px) {
      .header-container {
        margin: 8px 8px 16px 8px;
        padding: 12px 14px;
      }
      .title {
        font-size: 1.2rem;
      }
      .subtitle {
        display: none;
      }
      .status-badge {
        padding: 4px 10px;
        font-size: 0.72rem;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() selectedGameId: LotteryType | null = null;
  @Input() loading = false;
  @Output() gameSelected = new EventEmitter<LotteryType | null>();

  lotteryList: LotteryConfig[] = Object.values(LOTTERY_CONFIGS);

  trackByTab(index: number, game: LotteryConfig): string {
    return game.id;
  }

  selectGame(id: LotteryType | null): void {
    this.gameSelected.emit(id);
  }
}
