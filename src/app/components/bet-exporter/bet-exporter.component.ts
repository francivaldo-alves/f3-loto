import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedBet, LotteryConfig } from '../../models/lottery.model';

@Component({
  selector: 'app-bet-exporter',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="closeModal()">
      <div class="modal-dialog glass-panel" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Exportar Apostas - {{ config?.name }}</h3>
            <p class="modal-subtitle">
              Total de {{ bets.length }} bilhete(s) pronto(s) para preenchimento.
            </p>
          </div>
          <button class="btn-close" (click)="closeModal()">✕</button>
        </div>

        <div class="modal-body">
          <div class="export-actions-row">
            <button class="btn-primary" (click)="copyAllBets()">
              {{ copiedAll ? '✓ Todas Copiadas!' : '📋 Copiar Todas as Apostas' }}
            </button>
            <button class="btn-secondary" (click)="downloadTxtFile()">
              💾 Baixar Arquivo .TXT
            </button>
            <button class="btn-secondary" (click)="printBets()">
              🖨️ Imprimir Bilhetes
            </button>
          </div>

          <div class="code-preview-box">
            <pre>{{ formattedBetsText }}</pre>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeModal()">Fechar</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }
    .modal-dialog {
      width: 100%;
      max-width: 620px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
    }
    .modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .modal-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      color: #ffffff;
    }
    .modal-subtitle {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .btn-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.2rem;
      cursor: pointer;
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      -webkit-overflow-scrolling: touch;
    }
    .export-actions-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .code-preview-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      padding: 14px;
      max-height: 260px;
      overflow-y: auto;
    }
    pre {
      font-family: var(--font-mono);
      font-size: 0.84rem;
      color: var(--accent-gold);
      white-space: pre-wrap;
    }
    .modal-footer {
      padding: 14px 22px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 480px) {
      .modal-dialog {
        max-height: 92vh;
      }
      .modal-header, .modal-body, .modal-footer {
        padding: 14px;
      }
      .export-actions-row {
        flex-direction: column;
      }
      .export-actions-row button {
        width: 100%;
      }
    }
  `]
})
export class BetExporterComponent {
  @Input() config: LotteryConfig | null = null;
  @Input() bets: GeneratedBet[] = [];
  @Output() close = new EventEmitter<void>();

  copiedAll = false;

  get formattedBetsText(): string {
    if (!this.bets || this.bets.length === 0) return '';
    const header = `=== SortLoto PRO - ${this.config?.name || 'Loteria'} ===\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    const lines = this.bets.map((b, idx) => {
      let line = `Jogo #${idx + 1}: ${b.numbers.join(' - ')}`;
      if (b.trevos && b.trevos.length > 0) {
        line += ` | Trevos: ${b.trevos.join(' - ')}`;
      }
      return line;
    });
    return header + lines.join('\n');
  }

  closeModal(): void {
    this.close.emit();
  }

  copyAllBets(): void {
    navigator.clipboard.writeText(this.formattedBetsText).then(() => {
      this.copiedAll = true;
      setTimeout(() => this.copiedAll = false, 2500);
    });
  }

  downloadTxtFile(): void {
    const element = document.createElement('a');
    const file = new Blob([this.formattedBetsText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `apostas_${this.config?.id || 'loterias'}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  printBets(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 20px;">${this.formattedBetsText}</pre>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}
