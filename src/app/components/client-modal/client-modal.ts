import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Client, Executive } from '../../services/executives';

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

  get clientDataKeys(): string[] {
    return this.selectedClient ? Object.keys(this.selectedClient.data) : [];
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
