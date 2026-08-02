import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneratedBet, GeneratorOptions, LotteryConfig, NumberFrequency } from '../../models/lottery.model';

@Component({
  selector: 'app-smart-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="generator-container glass-panel">
      <div class="generator-header">
        <div>
          <h3 class="title">Gerador de Apostas & Desdobramentos</h3>
          <p class="subtitle">
            Configure suas preferências matemáticas para montar bilhetes otimizados da {{ config.name }}.
          </p>
        </div>
      </div>

      <!-- Configurações do Gerador -->
      <div class="generator-controls-grid">
        
        <div class="control-box">
          <label class="control-label">Modelo de Combinação Estatística:</label>
          <div class="strategy-selector">
            
            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'specialist'"
              (click)="options.strategy = 'specialist'">
              <div class="strat-txt">
                <strong>Especialista Estatístico</strong>
                <small>Primos, Moldura & Gauss</small>
              </div>
            </button>

            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'weighted'"
              (click)="options.strategy = 'weighted'">
              <div class="strat-txt">
                <strong>Roleta Ponderada</strong>
                <small>Maior chance às dezenas quentes</small>
              </div>
            </button>

            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'closure'"
              (click)="options.strategy = 'closure'">
              <div class="strat-txt">
                <strong>Fechamento de Matriz</strong>
                <small>Desdobramento com garantia</small>
              </div>
            </button>

            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'hot'"
              (click)="options.strategy = 'hot'">
              <div class="strat-txt">
                <strong>Números Frequentes</strong>
                <small>Foco no ranking de repetição</small>
              </div>
            </button>

            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'balanced'"
              (click)="options.strategy = 'balanced'">
              <div class="strat-txt">
                <strong>Equilibrado</strong>
                <small>Dezenas quentes + atrasadas</small>
              </div>
            </button>

            <button
              class="strategy-btn"
              [class.active]="options.strategy === 'custom'"
              (click)="options.strategy = 'custom'">
              <div class="strat-txt">
                <strong>Personalizado</strong>
                <small>Com dezenas fixas e excluídas</small>
              </div>
            </button>

          </div>
        </div>

        <div class="control-box-row">
          <div class="control-box">
            <label class="control-label">Dezenas por Bilhete:</label>
            <select class="custom-select" [(ngModel)]="options.numbersPerBet">
              <option *ngFor="let count of config.allowedBetCounts" [value]="count">
                {{ count }} Dezenas {{ count === config.defaultBetCount ? '(Aposta Simples)' : '(Aposta Múltipla)' }}
              </option>
            </select>
          </div>

          <div class="control-box">
            <label class="control-label">Quantidade de Apostas:</label>
            <select class="custom-select" [(ngModel)]="options.numberOfBets">
              <option [value]="1">1 Aposta</option>
              <option [value]="3">3 Apostas</option>
              <option [value]="5">5 Apostas</option>
              <option [value]="10">10 Apostas</option>
              <option [value]="20">20 Apostas</option>
              <option [value]="50">50 Apostas</option>
            </select>
          </div>

          <div class="control-box">
            <label class="control-label">Balanço Par / Ímpar:</label>
            <select class="custom-select" [(ngModel)]="options.evenOddBalance">
              <option value="any">Qualquer Distribuição</option>
              <option value="balanced">Equilibrado (Recomendado)</option>
              <option value="more_evens">Mais Pares</option>
              <option value="more_odds">Mais Ímpares</option>
            </select>
          </div>
        </div>

        <!-- Dezenas Fixas e Excluídas Ativas -->
        <div class="selection-pills-row" *ngIf="fixedNumbers.length > 0 || excludedNumbers.length > 0">
          <div class="pills-group" *ngIf="fixedNumbers.length > 0">
            <span class="group-label">Dezenas Fixas ({{ fixedNumbers.length }}):</span>
            <span *ngFor="let num of fixedNumbers; trackBy: trackByNum" class="pill fixed">
              {{ num }} <button (click)="removeFixed.emit(num)">✕</button>
            </span>
          </div>

          <div class="pills-group" *ngIf="excludedNumbers.length > 0">
            <span class="group-label">Dezenas Excluídas ({{ excludedNumbers.length }}):</span>
            <span *ngFor="let num of excludedNumbers; trackBy: trackByNum" class="pill excluded">
              {{ num }} <button (click)="removeExcluded.emit(num)">✕</button>
            </span>
          </div>
        </div>

        <div class="generate-btn-wrapper">
          <button class="btn-primary lg" (click)="onGenerate()">
            Gerar {{ options.numberOfBets }} Apostas Otimizadas
          </button>
        </div>

      </div>

      <!-- Bilhetes de Apostas Gerados -->
      <div class="generated-results-section" *ngIf="generatedBets.length > 0">
        <div class="results-header">
          <h4 class="results-title">
            {{ generatedBets.length }} Bilhetes Prontos para {{ config.name }}
          </h4>
          <div class="action-buttons">
            <button class="btn-secondary" (click)="onExportBets()">
              Copiar / Imprimir Todos
            </button>
          </div>
        </div>

        <div class="bets-cards-list">
          <div *ngFor="let bet of generatedBets; let i = index; trackBy: trackByBet" class="ticket-stub">
            <div class="bet-card-header">
              <div class="bet-header-left">
                <span class="bet-number-tag">Aposta #{{ i + 1 }}</span>
                <span class="badge-specialist-score" *ngIf="bet.specialistScore">
                  Score {{ bet.specialistScore }}/100
                </span>
                <span class="badge-verdict" *ngIf="bet.specialistVerdict">
                  {{ bet.specialistVerdict }}
                </span>
              </div>

              <div class="bet-badges">
                <span class="badge-boost" *ngIf="bet.probabilityBoost">+{{ bet.probabilityBoost }}% Ganho Estatístico</span>
                <span class="badge-hot">{{ bet.hotRate }}% Dezenas Quentes</span>
                <span class="badge-cold">{{ bet.evenOddRatio }}</span>
              </div>
            </div>

            <div class="bet-balls-row">
              <div
                *ngFor="let num of bet.numbers; trackBy: trackByNum"
                class="loto-ball sm"
                [style.--ball-color]="config.color"
                [style.--ball-dark-color]="config.secondaryColor">
                {{ num }}
              </div>

              <div *ngIf="bet.trevos && bet.trevos.length > 0" class="trevos-inline">
                <span class="trevo-txt">Trevos:</span>
                <div *ngFor="let t of bet.trevos; trackBy: trackByNum" class="loto-ball sm trevo">
                  {{ t }}
                </div>
              </div>
            </div>

            <!-- Diagnóstico Detalhado do Especialista -->
            <div class="specialist-metrics-bar">
              <div class="metric-item" *ngIf="bet.primesCount !== undefined">
                <span class="metric-label">Primos:</span>
                <span class="metric-val">{{ bet.primesCount }} dezenas</span>
              </div>
              <div class="metric-item" *ngIf="bet.frameCenterRatio">
                <span class="metric-label">Geometria:</span>
                <span class="metric-val">{{ bet.frameCenterRatio }}</span>
              </div>
              <div class="metric-item" *ngIf="bet.quadrantDistribution">
                <span class="metric-label">Quadrantes:</span>
                <span class="metric-val">{{ bet.quadrantDistribution }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Soma:</span>
                <span class="metric-val">{{ bet.sum }}</span>
              </div>
            </div>

            <div class="simulated-hits-bar" *ngIf="bet.simulatedHits">
              <span class="sim-text">
                Histórico ({{ bet.simulatedHits.totalTested }} concursos):
                Maior pontuação registrada foi <strong>{{ bet.simulatedHits.maxHits }} acertos</strong>.
              </span>
            </div>

            <div class="bet-card-footer">
              <button class="btn-copy" (click)="copySingleBet(bet)">
                {{ copiedBetId === bet.id ? '✓ Copiado!' : 'Copiar Aposta' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .generator-container {
      padding: 24px;
      margin-bottom: 24px;
      border-radius: var(--radius-lg);
    }
    .generator-header {
      margin-bottom: 20px;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
    }
    .subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .generator-controls-grid {
      display: flex;
      flex-direction: column;
      gap: 18px;
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .control-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: block;
    }
    .strategy-selector {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    .strategy-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      padding: 12px;
      color: var(--text-main);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .strategy-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .strategy-btn.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
    }
    .strat-txt strong {
      display: block;
      font-size: 0.86rem;
      font-weight: 700;
    }
    .strat-txt small {
      font-size: 0.72rem;
      color: var(--text-subtle);
    }
    .control-box-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .custom-select {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      font-weight: 600;
      outline: none;
    }
    .selection-pills-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pills-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .group-label {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 700;
    }
    .pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pill button {
      background: none;
      border: none;
      color: currentColor;
      cursor: pointer;
      font-weight: 800;
    }
    .pill.fixed {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .pill.excluded {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .generate-btn-wrapper {
      margin-top: 6px;
    }
    .btn-primary.lg {
      width: 100%;
      padding: 14px 24px;
      font-size: 1rem;
    }

    .generated-results-section {
      margin-top: 28px;
    }
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .results-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      color: #ffffff;
    }
    .bets-cards-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bet-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .bet-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .bet-number-tag {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--accent-gold);
    }
    .badge-specialist-score {
      font-size: 0.75rem;
      font-weight: 800;
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 2px 10px;
      border-radius: var(--radius-full);
    }
    .badge-verdict {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .badge-boost {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-size: 0.75rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }
    .badge-hot, .badge-cold {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }
    .bet-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .bet-balls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .trevos-inline {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
    }
    .trevo-txt {
      font-size: 0.75rem;
      color: var(--accent-gold);
    }
    .specialist-metrics-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      margin-bottom: 10px;
    }
    .metric-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .metric-label {
      color: var(--text-subtle);
      font-weight: 700;
    }
    .metric-val {
      color: #ffffff;
      font-weight: 600;
    }
    .simulated-hits-bar {
      background: rgba(0, 0, 0, 0.2);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .bet-card-footer {
      display: flex;
      justify-content: flex-end;
    }
    .btn-copy {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-copy:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `]
})
export class SmartGeneratorComponent implements OnChanges {
  @Input() config!: LotteryConfig;
  @Input() frequencies: NumberFrequency[] = [];
  @Input() fixedNumbers: string[] = [];
  @Input() excludedNumbers: string[] = [];
  @Input() generatedBets: GeneratedBet[] = [];

  @Output() generate = new EventEmitter<GeneratorOptions>();
  @Output() exportBets = new EventEmitter<void>();
  @Output() removeFixed = new EventEmitter<string>();
  @Output() removeExcluded = new EventEmitter<string>();

  options: GeneratorOptions = {
    strategy: 'specialist',
    numbersPerBet: 6,
    numberOfBets: 5,
    fixedNumbers: [],
    excludedNumbers: [],
    evenOddBalance: 'balanced',
    applyGaussFilter: true
  };

  copiedBetId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.options.numbersPerBet = this.config.defaultBetCount;
    }
  }

  trackByBet(index: number, bet: GeneratedBet): string {
    return bet.id;
  }

  trackByNum(index: number, num: string): string {
    return num;
  }

  onGenerate(): void {
    this.options.fixedNumbers = this.fixedNumbers;
    this.options.excludedNumbers = this.excludedNumbers;
    this.generate.emit({ ...this.options });
  }

  onExportBets(): void {
    this.exportBets.emit();
  }

  copySingleBet(bet: GeneratedBet): void {
    const text = bet.numbers.join(' - ') + (bet.trevos ? ` (Trevos: ${bet.trevos.join(', ')})` : '');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedBetId = bet.id;
      setTimeout(() => {
        if (this.copiedBetId === bet.id) this.copiedBetId = null;
      }, 2000);
    });
  }
}
