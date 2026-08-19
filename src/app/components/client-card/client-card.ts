import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ClientCardView } from '../../models/client-view.model';

@Component({
  selector: 'app-client-card',
  standalone: false,
  templateUrl: './client-card.html',
  styleUrl: './client-card.scss',
})
export class ClientCard {
  @Input({ required: true }) view!: ClientCardView;
  @Input() displayName = '';
  @Input() showMeta = false;
  @Input() pendingTodos = 0;
  @Output() cardClick = new EventEmitter<void>();

  get name(): string {
    return this.displayName || this.view.client.name;
  }
}
