import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneratedBet, GeneratorOptions, LotteryConfig, NumberFrequency } from '../../models/lottery.model';

interface StrategyOption {
  id: GeneratorOptions['strategy'];
  icon: string;
  label: string;
  desc: string;
  color: string;
}

@Component({
  selector: 'app-smart-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="generator-container glass-panel">

      <!-- Cabeçalho -->
      <div class="generator-header">
        <div class="gen-title-row">
          <span class="gen-icon">🎰</span>
          <div>
            <h3 class="title">Gerador de Apostas</h3>
            <p class="subtitle">Monte bilhetes para a <strong>{{ config.name }}</strong> com base no histórico real de sorteios.</p>
          </div>
        </div>
      </div>

      <!-- Seleção de Estratégia -->
      <div class="section-block">
        <label class="section-label">Como você quer escolher os números?</label>
        <div class="strategy-grid">
          <button
            *ngFor="let s of strategies"
            class="strategy-btn"
            [class.active]="options.strategy === s.id"
            [style.--s-color]="s.color"
            (click)="options.strategy = s.id">
            <span class="s-icon">{{ s.icon }}</span>
            <div class="s-txt">
              <strong>{{ s.label }}</strong>
              <small>{{ s.desc }}</small>
            </div>
            <div class="s-check" *ngIf="options.strategy === s.id">✓</div>
          </button>
        </div>
      </div>

      <!-- Configurações -->
      <div class="section-block config-row">

        <div class="config-item">
          <label class="config-label">Dezenas por aposta</label>
          <div class="pill-selector">
            <button
              *ngFor="let count of config.allowedBetCounts"
              class="pill-btn"
              [class.active]="options.numbersPerBet === count"
              (click)="options.numbersPerBet = count">
              {{ count }}
              <span *ngIf="count === config.defaultBetCount" class="simple-mark">simples</span>
            </button>
          </div>
        </div>

        <div class="config-item">
          <label class="config-label">Quantidade de bilhetes</label>
          <div class="pill-selector">
            <button
              *ngFor="let n of [1, 3, 5, 10, 20, 50]"
              class="pill-btn"
              [class.active]="options.numberOfBets === n"
              (click)="options.numberOfBets = n">
              {{ n }}
            </button>
          </div>
        </div>

        <div class="config-item">
          <label class="config-label">Balanço par / ímpar</label>
          <div class="pill-selector">
            <button
              *ngFor="let opt of evenOddOptions"
              class="pill-btn"
              [class.active]="options.evenOddBalance === opt.value"
              (click)="options.evenOddBalance = opt.value">
              {{ opt.label }}
            </button>
          </div>
        </div>

      </div>

      <!-- Dezenas fixas e excluídas -->
      <div class="section-block" *ngIf="fixedNumbers.length > 0 || excludedNumbers.length > 0">
        <label class="section-label">Seleção manual</label>
        <div class="pills-area">
          <div class="pill-group" *ngIf="fixedNumbers.length > 0">
            <span class="pill-group-label">📌 Fixadas:</span>
            <span *ngFor="let num of fixedNumbers; trackBy: trackByNum" class="num-pill fixed">
              {{ num }} <button (click)="removeFixed.emit(num)" title="Remover">✕</button>
            </span>
          </div>
          <div class="pill-group" *ngIf="excludedNumbers.length > 0">
            <span class="pill-group-label">🚫 Excluídas:</span>
            <span *ngFor="let num of excludedNumbers; trackBy: trackByNum" class="num-pill excluded">
              {{ num }} <button (click)="removeExcluded.emit(num)" title="Remover">✕</button>
            </span>
          </div>
        </div>
      </div>

      <!-- Botão de gerar -->
      <button class="btn-generate" (click)="onGenerate()">
        <span class="gen-btn-icon">✨</span>
        Gerar {{ options.numberOfBets }} {{ options.numberOfBets === 1 ? 'Bilhete' : 'Bilhetes' }}
      </button>

      <!-- ─── RESULTADOS ─── -->
      <div class="results-section" *ngIf="generatedBets.length > 0">
        <div class="results-header">
          <h4 class="results-title">
            {{ generatedBets.length }} {{ generatedBets.length === 1 ? 'Bilhete gerado' : 'Bilhetes gerados' }}
            <span class="for-game">para {{ config.name }}</span>
          </h4>
          <button class="btn-export" (click)="onExportBets()">
            🖨️ Copiar / Imprimir Todos
          </button>
        </div>

        <div class="bets-list">
          <div *ngFor="let bet of generatedBets; let i = index; trackBy: trackByBet" class="ticket">

            <!-- Cabeçalho do bilhete -->
            <div class="ticket-top">
              <div class="ticket-top-left">
                <span class="ticket-num">#{{ i + 1 }}</span>
                <div class="score-bar">
                  <div class="score-fill" [style.width.%]="bet.specialistScore" [class.score-high]="bet.specialistScore >= 80" [class.score-med]="bet.specialistScore >= 65 && bet.specialistScore < 80"></div>
                </div>
                <span class="score-label" [class.score-high]="bet.specialistScore >= 80">{{ bet.specialistScore }}/100</span>
              </div>
              <span class="verdict-badge">{{ bet.specialistVerdict }}</span>
            </div>

            <!-- Bolas -->
            <div class="bet-balls-row">
              <div
                *ngFor="let num of bet.numbers; trackBy: trackByNum"
                class="loto-ball sm"
                [style.--ball-color]="config.color"
                [style.--ball-dark-color]="config.secondaryColor">
                {{ num }}
              </div>
              <div *ngIf="bet.trevos && bet.trevos.length > 0" class="trevos-inline">
                <span class="trevo-label">+Trevos</span>
                <div *ngFor="let t of bet.trevos; trackBy: trackByNum" class="loto-ball sm trevo">{{ t }}</div>
              </div>
            </div>

            <!-- Métricas rápidas (linguagem humana) -->
            <div class="metrics-row">
              <div class="metric-chip hot">
                🔥 {{ bet.hotRate }}% quentes
              </div>
              <div class="metric-chip neutral">
                ⚖️ {{ bet.evenOddRatio }}
              </div>
              <div class="metric-chip neutral" *ngIf="bet.primesCount > 0">
                🔢 {{ bet.primesCount }} primos
              </div>
              <div class="metric-chip neutral">
                Σ {{ bet.sum }}
              </div>
              <div class="metric-chip trend" *ngIf="bet.mathScore.includes('Tendência')">
                ⬆️ Em alta
              </div>
            </div>

            <!-- Histórico simulado -->
            <div class="sim-bar" *ngIf="bet.simulatedHits">
              <span class="sim-icon">🔍</span>
              Nos últimos <strong>{{ bet.simulatedHits.totalTested }}</strong> sorteios analisados, esse padrão teve máximo de <strong>{{ bet.simulatedHits.maxHits }} acertos</strong>.
            </div>

            <!-- Distribuição do volante -->
            <div class="quadrant-row">
              <span class="q-label">Distribuição:</span>
              <span class="q-val">{{ bet.quadrantDistribution }}</span>
            </div>

            <!-- Volante Visual Interativo Expandido -->
            <div class="volante-preview" *ngIf="activeVolanteBetId === bet.id">
              <div class="volante-preview-title">Volante Digital ({{ config.name }}):</div>
              <div class="volante-grid">
                <div
                  *ngFor="let num of getVolanteNumbers(); trackBy: trackByNum"
                  class="volante-cell"
                  [class.selected]="bet.numbers.includes(num)"
                  [style.--v-color]="config.color">
                  {{ num }}
                </div>
              </div>
            </div>

            <!-- Rodapé do bilhete -->
            <div class="ticket-footer">
              <button class="btn-volante" (click)="toggleVolante(bet.id)" [class.active]="activeVolanteBetId === bet.id">
                {{ activeVolanteBetId === bet.id ? '✕ Ocultar Volante' : '🎴 Ver no Volante' }}
              </button>
              <button class="btn-copy" (click)="copySingleBet(bet)" [class.copied]="copiedBetId === bet.id">
                {{ copiedBetId === bet.id ? '✓ Copiado!' : '📋 Copiar Aposta' }}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .generator-container {
      padding: 22px;
      margin-bottom: 24px;
      border-radius: var(--radius-lg);
    }

    /* ── Header ── */
    .gen-title-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }
    .gen-icon { font-size: 1.6rem; flex-shrink: 0; }
    .title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
    }
    .subtitle { font-size: 0.83rem; color: var(--text-muted); margin-top: 3px; }

    /* ── Seções ── */
    .section-block {
      margin-bottom: 18px;
    }
    .section-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ── Estratégias ── */
    .strategy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 9px;
    }
    .strategy-btn {
      background: rgba(255,255,255,0.03);
      border: 1.5px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 12px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      color: var(--text-main);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .strategy-btn:hover {
      background: rgba(255,255,255,0.07);
      border-color: rgba(255,255,255,0.18);
      transform: translateY(-1px);
    }
    .strategy-btn.active {
      background: color-mix(in srgb, var(--s-color, #10b981) 12%, transparent);
      border-color: var(--s-color, #10b981);
      box-shadow: 0 0 18px color-mix(in srgb, var(--s-color, #10b981) 25%, transparent);
    }
    .s-icon { font-size: 1.4rem; flex-shrink: 0; }
    .s-txt strong { display: block; font-size: 0.83rem; font-weight: 700; }
    .s-txt small { font-size: 0.7rem; color: var(--text-subtle); }
    .s-check {
      position: absolute;
      top: 6px; right: 8px;
      font-size: 0.7rem;
      color: var(--s-color, #10b981);
      font-weight: 800;
    }

    /* ── Configs (pill selectors) ── */
    .config-row {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: rgba(0,0,0,0.18);
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .config-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-subtle);
      margin-bottom: 7px;
    }
    .pill-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pill-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.09);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pill-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .pill-btn.active {
      background: rgba(16,185,129,0.2);
      border-color: #10b981;
      color: #34d399;
    }
    .simple-mark {
      font-size: 0.62rem;
      background: rgba(251,191,36,0.2);
      color: var(--accent-gold);
      padding: 1px 5px;
      border-radius: 999px;
      font-weight: 700;
    }

    /* ── Dezenas selecionadas ── */
    .pills-area {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pill-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 7px;
    }
    .pill-group-label { font-size: 0.76rem; color: var(--text-muted); font-weight: 700; }
    .num-pill {
      font-size: 0.76rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .num-pill button {
      background: none; border: none; cursor: pointer;
      color: currentColor; font-weight: 800; font-size: 0.8rem;
      padding: 0; line-height: 1;
    }
    .num-pill.fixed   { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
    .num-pill.excluded { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.4); }

    /* ── Botão Gerar ── */
    .btn-generate {
      width: 100%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 15px 24px;
      font-family: var(--font-main);
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 16px rgba(16,185,129,0.35);
      margin-bottom: 0;
    }
    .btn-generate:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(16,185,129,0.5);
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    }
    .btn-generate:active { transform: scale(0.98); }
    .gen-btn-icon { font-size: 1.1rem; }

    /* ── Seção de Resultados ── */
    .results-section { margin-top: 28px; }
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .results-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 800;
      color: #fff;
    }
    .for-game { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
    .btn-export {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-main);
      padding: 7px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-export:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.25); }

    /* ── Bilhetes ── */
    .bets-list { display: flex; flex-direction: column; gap: 14px; }

    .ticket {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      border: 1px dashed rgba(255,255,255,0.14);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      position: relative;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      transition: box-shadow 0.2s ease;
    }
    .ticket:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.45); }

    /* Recortes do bilhete físico */
    .ticket::before, .ticket::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 14px; height: 14px;
      background: #0b0f19;
      border-radius: 50%;
      transform: translateY(-50%);
    }
    .ticket::before { left: -8px; }
    .ticket::after  { right: -8px; }

    /* Topo do bilhete */
    .ticket-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ticket-top-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ticket-num {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--accent-gold);
    }
    /* Barra de score */
    .score-bar {
      width: 60px;
      height: 5px;
      background: rgba(255,255,255,0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .score-fill {
      height: 100%;
      border-radius: 999px;
      background: #64748b;
      transition: width 0.4s ease;
    }
    .score-fill.score-high { background: linear-gradient(90deg, #10b981, #34d399); }
    .score-fill.score-med  { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .score-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .score-label.score-high { color: #34d399; }
    .verdict-badge {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Bolas */
    .bet-balls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      align-items: center;
      margin-bottom: 12px;
    }
    .trevos-inline {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-left: 6px;
      padding-left: 10px;
      border-left: 1px solid rgba(255,255,255,0.1);
    }
    .trevo-label {
      font-size: 0.68rem;
      color: var(--accent-gold);
      font-weight: 700;
    }

    /* Métricas */
    .metrics-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .metric-chip {
      font-size: 0.73rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
    }
    .metric-chip.hot     { background: rgba(239,68,68,0.15);   color: #fca5a5; }
    .metric-chip.neutral { background: rgba(255,255,255,0.06); color: var(--text-muted); }
    .metric-chip.trend   { background: rgba(16,185,129,0.15);  color: #34d399; }

    /* Histórico simulado */
    .sim-bar {
      background: rgba(0,0,0,0.25);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      gap: 6px;
    }
    .sim-icon { flex-shrink: 0; }

    /* Distribuição */
    .quadrant-row {
      font-size: 0.73rem;
      color: var(--text-subtle);
      margin-bottom: 10px;
      display: flex;
      gap: 6px;
    }
    .q-label { font-weight: 700; color: var(--text-muted); }
    .q-val { color: var(--text-subtle); }

    /* Rodapé */
    .ticket-footer { display: flex; justify-content: flex-end; }
    .btn-copy {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-main);
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-copy:hover { background: rgba(255,255,255,0.14); }
    .btn-copy.copied {
      background: rgba(16,185,129,0.2);
      border-color: #10b981;
      color: #34d399;
    }

    /* ── Volante Visual ── */
    .btn-volante {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-muted);
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-volante:hover {
      background: rgba(255,255,255,0.14);
      color: #fff;
    }
    .btn-volante.active {
      background: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #93c5fd;
    }

    .volante-preview {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0 10px 0;
      animation: expandVolante 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes expandVolante {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .volante-preview-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-subtle);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .volante-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      max-width: 320px;
      margin: 0 auto;
    }
    .volante-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-subtle);
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 4px;
      transition: all 0.15s ease;
      user-select: none;
    }
    .volante-cell.selected {
      background: var(--v-color, #10b981);
      color: #000000;
      border-color: transparent;
      font-weight: 900;
      box-shadow: 0 0 8px var(--v-color, rgba(16,185,129,0.5));
    }

    @media (max-width: 576px) {
      .generator-container { padding: 14px; }
      .strategy-grid { grid-template-columns: 1fr 1fr; }
      .config-row { padding: 12px; }
      .volante-grid { gap: 2px; }
      .volante-cell { font-size: 0.62rem; }
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
  activeVolanteBetId: string | null = null;

  readonly strategies: StrategyOption[] = [
    { id: 'specialist', icon: '🏆', label: 'Especialista',    desc: 'Moldura, primos e distribuição Gauss', color: '#10b981' },
    { id: 'trend',      icon: '⬆️', label: 'Em Alta Agora',   desc: 'Dezenas crescendo nos últimos 30 sorteios', color: '#34d399' },
    { id: 'hot',        icon: '🔥', label: 'Mais Sorteadas',  desc: 'Foco nos números que mais saem', color: '#ef4444' },
    { id: 'balanced',   icon: '⚖️', label: 'Equilibrado',     desc: 'Mix de quentes + atrasadas', color: '#f59e0b' },
    { id: 'weighted',   icon: '🎯', label: 'Por Peso',        desc: 'Proporção à frequência histórica', color: '#3b82f6' },
    { id: 'closure',    icon: '🔒', label: 'Fechamento',      desc: 'Cobertura garantida por matriz', color: '#8b5cf6' },
    { id: 'custom',     icon: '✏️', label: 'Personalizado',   desc: 'Com dezenas fixas e excluídas', color: '#64748b' },
  ];

  readonly evenOddOptions: { label: string; value: GeneratorOptions['evenOddBalance'] }[] = [
    { label: 'Qualquer', value: 'any' },
    { label: 'Equilibrado ✓', value: 'balanced' },
    { label: 'Mais pares', value: 'more_evens' },
    { label: 'Mais ímpares', value: 'more_odds' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.options.numbersPerBet = this.config.defaultBetCount;
      this.activeVolanteBetId = null;
    }
  }

  trackByBet(index: number, bet: GeneratedBet): string { return bet.id; }
  trackByNum(index: number, num: string): string { return num; }

  onGenerate(): void {
    this.options.fixedNumbers = this.fixedNumbers;
    this.options.excludedNumbers = this.excludedNumbers;
    this.generate.emit({ ...this.options });
  }

  onExportBets(): void { this.exportBets.emit(); }

  copySingleBet(bet: GeneratedBet): void {
    const text = bet.numbers.join(' - ') + (bet.trevos ? ` | Trevos: ${bet.trevos.join(', ')}` : '');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedBetId = bet.id;
      setTimeout(() => { if (this.copiedBetId === bet.id) this.copiedBetId = null; }, 2000);
    });
  }

  toggleVolante(betId: string): void {
    this.activeVolanteBetId = this.activeVolanteBetId === betId ? null : betId;
  }

  getVolanteNumbers(): string[] {
    if (!this.config) return [];
    const list: string[] = [];
    for (let i = this.config.minNumber; i <= this.config.maxNumber; i++) {
      list.push(String(i).padStart(this.config.numberPadding, '0'));
    }
    return list;
  }
}
