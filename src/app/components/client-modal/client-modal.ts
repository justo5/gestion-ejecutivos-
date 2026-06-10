import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Executive } from '../../services/executives';

@Component({
  selector: 'app-client-modal',
  standalone: false,
  templateUrl: './client-modal.html',
  styleUrl: './client-modal.scss',
})
export class ClientModal implements OnChanges {
  @Input() executive: Executive | null = null;
  @Output() closed = new EventEmitter<void>();

  columns: string[] = [];
  businessNameKey = '';
  statusKey = '';
  selectedClient: any | null = null;
  clientKeys: string[] = [];

  ngOnChanges(): void {
    this.selectedClient = null;
    if (this.executive?.clients?.length) {
      const allKeys = new Set<string>();
      this.executive.clients.forEach(c => Object.keys(c).forEach(k => allKeys.add(k)));
      this.columns = [...allKeys];
      this.businessNameKey =
        this.columns.find(k => /fan\s*page/i.test(k)) ??
        this.columns.find(k => /negocio|empresa|business|razón|razon|nombre|cliente/i.test(k)) ??
        this.columns[0];
      this.statusKey = this.columns.find(k => /estado|status/i.test(k)) ?? '';
    } else {
      this.columns = [];
      this.businessNameKey = '';
      this.statusKey = '';
    }
  }

  getBusinessName(client: any): string {
    return client[this.businessNameKey] ?? '—';
  }

  isActive(client: any): boolean {
    if (!this.statusKey) return false;
    return /activo|active/i.test(String(client[this.statusKey] ?? ''));
  }

  selectClient(client: any): void {
    this.selectedClient = client;
    this.clientKeys = Object.keys(client);
  }

  clearSelection(): void {
    this.selectedClient = null;
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
