import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ClientCardView } from '../../models/client-view.model';
import { clientDisplayName } from '../../utils/client-display-name';

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
  @Output() imageChanged = new EventEmitter<{ id: string; url: string }>();

  get name(): string {
    return this.displayName || clientDisplayName(this.view.client);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.imageChanged.emit({ id: this.view.client.id, url: reader.result as string });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }
}
