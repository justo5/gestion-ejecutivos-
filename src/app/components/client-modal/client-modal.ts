import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CLIENT_DETAIL_FIELDS, Client, Executive } from '../../services/executives';

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

  ngOnChanges(): void {
    this.selectedClient = null;
  }

  get clientFields(): { label: string; value: unknown }[] {
    if (!this.selectedClient) return [];
    const client = this.selectedClient;

    // Campos tipados destacados, en su orden definido.
    const typed = CLIENT_DETAIL_FIELDS.map(field => ({
      label: field.label,
      value: client[field.key],
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
