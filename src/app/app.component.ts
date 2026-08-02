import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { LotteryDashboardComponent } from './components/lottery-dashboard/lottery-dashboard.component';
import { FrequencyHeatmapComponent } from './components/frequency-heatmap/frequency-heatmap.component';
import { SmartGeneratorComponent } from './components/smart-generator/smart-generator.component';
import { BetExporterComponent } from './components/bet-exporter/bet-exporter.component';
import { RoiPanelComponent } from './components/roi-panel/roi-panel.component';
import { LotteryApiService } from './services/lottery-api.service';
import { StatsEngineService } from './services/stats-engine.service';
import { CombinatorService } from './services/combinator.service';
import {
  GeneratedBet,
  GeneratorOptions,
  LotteryConfig,
  LotteryDraw,
  LotteryType,
  LOTTERY_CONFIGS,
  NumberFrequency
} from './models/lottery.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    LotteryDashboardComponent,
    FrequencyHeatmapComponent,
    SmartGeneratorComponent,
    BetExporterComponent,
    RoiPanelComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  selectedGameId: LotteryType | null = null;
  selectedConfig: LotteryConfig | null = null;

  // Inicializado instantaneamente (0ms) com dados semente para a Home abrir sem espera
  latestDrawsMap: Map<LotteryType, LotteryDraw> = new Map();
  
  currentHistory: LotteryDraw[] = [];
  frequencies: NumberFrequency[] = [];
  evenOddStats: any = null;
  sampleLimit = 200;
  
  fixedNumbers: string[] = [];
  excludedNumbers: string[] = [];
  
  generatedBets: GeneratedBet[] = [];
  showExportModal = false;

  currentBetSize = 6;
  numberOfBets = 5;

  loading = false;
  errorMessage: string | null = null;

  lotteryTypes: LotteryType[] = [
    'maismilionaria',
    'megasena',
    'lotofacil',
    'quina',
    'lotomania',
    'timemania',
    'duplasena',
    'federal',
    'diadesorte',
    'supersete'
  ];

  constructor(
    private apiService: LotteryApiService,
    private statsEngine: StatsEngineService,
    private combinator: CombinatorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 1. Carrega o mapa semente instantaneamente (0ms)
    this.latestDrawsMap = this.apiService.getInitialSeedMap();
    this.cdr.markForCheck();

    // 2. Atualiza cada loteria de forma assíncrona e independente
    this.loadAllLatestDrawsAsync();
  }

  loadAllLatestDrawsAsync(): void {
    this.apiService.fetchLatestDrawsIndividually(this.lotteryTypes, (type, draw) => {
      this.latestDrawsMap.set(type, draw);
      this.cdr.markForCheck();
    });
  }

  onGameSelected(gameId: LotteryType | null): void {
    this.selectedGameId = gameId;
    this.generatedBets = [];
    this.fixedNumbers = [];
    this.excludedNumbers = [];

    if (!gameId) {
      this.selectedConfig = null;
      this.cdr.markForCheck();
      return;
    }

    this.selectedConfig = LOTTERY_CONFIGS[gameId];
    this.currentBetSize = this.selectedConfig.defaultBetCount;
    this.numberOfBets = 5;
    this.loadGameData(gameId, this.sampleLimit);
  }

  onSampleLimitChange(limit: number): void {
    this.sampleLimit = limit;
    if (this.selectedGameId) {
      this.loadGameData(this.selectedGameId, limit);
    }
  }

  loadGameData(gameId: LotteryType, limit: number): void {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.apiService.getLotteryHistory(gameId, limit).subscribe({
      next: (history) => {
        this.loading = false;
        this.currentHistory = history;
        if (this.selectedConfig) {
          this.frequencies = this.statsEngine.calculateFrequencies(history, this.selectedConfig);
          this.evenOddStats = this.statsEngine.calculateEvenOddStats(history);
          
          // Gerar apostas iniciais com a Estratégia Especialista
          this.onGenerateBets({
            strategy: 'specialist',
            numbersPerBet: this.selectedConfig.defaultBetCount,
            numberOfBets: 5,
            fixedNumbers: [],
            excludedNumbers: [],
            evenOddBalance: 'balanced',
            applyGaussFilter: true
          });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Erro ao carregar dados da loteria.';
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  onGenerateBets(options: GeneratorOptions): void {
    if (!this.selectedConfig) return;
    this.currentBetSize = options.numbersPerBet;
    this.numberOfBets = options.numberOfBets;
    this.generatedBets = this.combinator.generateCombinations(
      this.selectedConfig,
      this.frequencies,
      options,
      this.currentHistory
    );
    this.cdr.markForCheck();
  }

  onToggleFixed(num: string): void {
    const idx = this.fixedNumbers.indexOf(num);
    if (idx >= 0) {
      this.fixedNumbers.splice(idx, 1);
    } else {
      if (this.selectedConfig && this.fixedNumbers.length >= this.selectedConfig.defaultBetCount - 1) {
        return;
      }
      this.fixedNumbers.push(num);
    }
    this.cdr.markForCheck();
  }

  onToggleExcluded(num: string): void {
    const idx = this.excludedNumbers.indexOf(num);
    if (idx >= 0) {
      this.excludedNumbers.splice(idx, 1);
    } else {
      this.excludedNumbers.push(num);
    }
    this.cdr.markForCheck();
  }

  onRemoveFixed(num: string): void {
    this.fixedNumbers = this.fixedNumbers.filter(n => n !== num);
    this.cdr.markForCheck();
  }

  onRemoveExcluded(num: string): void {
    this.excludedNumbers = this.excludedNumbers.filter(n => n !== num);
    this.cdr.markForCheck();
  }
}
