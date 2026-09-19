import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CLIENT_DETAIL_FIELDS, Client, Executive, ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-client-modal',
  standalone: false,
  templateUrl: './client-modal.html',
  styleUrl: './client-modal.scss',
})
export class ClientModal implements OnChanges {
  @Input() executive: Executive | null = null;
  @Output() closed = new EventEmitter<void>();

  selectedClient: Client | null = null;

  // Traspaso de clientes (este modal solo lo usa el admin, en Ejecutivos).
  selectedIds = new Set<string>();
  targetId = '';
  confirmingTransfer = false;
  transferring = false;
  transferError = '';
  transferMessage = '';

  constructor(private executivesService: ExecutivesService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.selectedClient = null;

    const previous: Executive | null = changes['executive']?.previousValue ?? null;
    if (previous?.id !== this.executive?.id) {
      // Se abrió otro ejecutivo: se descarta todo el estado del traspaso.
      this.selectedIds.clear();
      this.targetId = '';
      this.confirmingTransfer = false;
      this.transferError = '';
      this.transferMessage = '';
    } else {
      // Mismo ejecutivo con datos refrescados (ej. tras un traspaso): solo se
      // descartan las selecciones de clientes que ya no están acá.
      const ids = new Set((this.executive?.clients ?? []).map((c) => c.id));
      this.selectedIds.forEach((id) => !ids.has(id) && this.selectedIds.delete(id));
      if (this.selectedIds.size === 0) this.confirmingTransfer = false;
    }
  }

  // Ejecutivos a los que se puede traspasar (todos menos el actual).
  get targets(): Executive[] {
    return this.executivesService.currentExecutives.filter((e) => e.id !== this.executive?.id);
  }

  get targetName(): string {
    return this.targets.find((e) => e.id === this.targetId)?.name ?? '';
  }

  get allSelected(): boolean {
    const total = this.executive?.clients.length ?? 0;
    return total > 0 && this.selectedIds.size === total;
  }

  isSelected(client: Client): boolean {
    return this.selectedIds.has(client.id);
  }

  toggleSelected(client: Client): void {
    if (!this.selectedIds.delete(client.id)) this.selectedIds.add(client.id);
    this.onSelectionChanged();
  }

  toggleAll(): void {
    if (this.allSelected) {
      this.selectedIds.clear();
    } else {
      (this.executive?.clients ?? []).forEach((c) => this.selectedIds.add(c.id));
    }
    this.onSelectionChanged();
  }

  private onSelectionChanged(): void {
    this.confirmingTransfer = false;
    this.transferError = '';
    this.transferMessage = '';
  }

  askTransfer(): void {
    if (!this.targetId || this.selectedIds.size === 0) return;
    this.confirmingTransfer = true;
    this.transferError = '';
  }

  cancelTransfer(): void {
    this.confirmingTransfer = false;
  }

  confirmTransfer(): void {
    if (!this.executive || !this.targetId || this.selectedIds.size === 0) return;
    const count = this.selectedIds.size;
    const targetName = this.targetName;

    this.transferring = true;
    this.transferError = '';
    this.executivesService
      .transferClients(this.executive.id, this.targetId, [...this.selectedIds])
      .subscribe({
        next: () => {
          this.transferring = false;
          this.confirmingTransfer = false;
          this.selectedIds.clear();
          this.targetId = '';
          this.transferMessage = `${count} cliente${count === 1 ? '' : 's'} traspasado${count === 1 ? '' : 's'} a ${targetName}.`;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.transferring = false;
          this.confirmingTransfer = false;
          this.transferError =
            typeof err.error?.message === 'string'
              ? err.error.message
              : 'No se pudo traspasar. Intentá de nuevo.';
          this.cdr.markForCheck();
        },
      });
  }

  get clientFields(): { label: string; value: unknown }[] {
    if (!this.selectedClient) return [];
    const client = this.selectedClient;

    // Campos tipados destacados, en su orden definido.
    const typed = CLIENT_DETAIL_FIELDS.map(field => ({
      label: field.label,
      value: field.format ? field.format(client[field.key]) : client[field.key],
    }));

    // Resto de columnas crudas del archivo importado (data) que no estén ya cubiertas.
    const known = new Set(
      CLIENT_DETAIL_FIELDS.map(field => String(field.label).toLowerCase()),
    );
    const raw = Object.entries(client.data ?? {})
      .filter(([label]) => !known.has(String(label).toLowerCase()))
      .map(([label, value]) => ({ label, value }));

    return [...typed, ...raw].filter(
      field =>
        field.value !== null &&
        field.value !== undefined &&
        String(field.value).trim() !== '',
    );
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
  }

  clearSelection(): void {
    this.selectedClient = null;
  }

  close(): void {
    this.selectedClient = null;
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
