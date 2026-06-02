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

  ngOnChanges(): void {
    if (this.executive?.clients?.length) {
      this.columns = Object.keys(this.executive.clients[0]);
    } else {
      this.columns = [];
    }
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
