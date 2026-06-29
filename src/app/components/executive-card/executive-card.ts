import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Executive } from '../../services/executives';

@Component({
  selector: 'app-executive-card',
  standalone: false,
  templateUrl: './executive-card.html',
  styleUrl: './executive-card.scss',
})
export class ExecutiveCard {
  @Input() executive!: Executive;
  @Output() imageChanged = new EventEmitter<{ id: string; url: string }>();
  @Output() cardClicked = new EventEmitter<Executive>();

  onCardClick(): void {
    this.cardClicked.emit(this.executive);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.imageChanged.emit({ id: this.executive.id, url: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  getInitials(): string {
    return this.executive.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
