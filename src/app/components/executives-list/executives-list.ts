import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Executive, ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-executives-list',
  standalone: false,
  templateUrl: './executives-list.html',
  styleUrl: './executives-list.scss',
})
export class ExecutivesList {
  executives$: Observable<Executive[]>;
  selectedExecutive: Executive | null = null;

  constructor(private executivesService: ExecutivesService) {
    this.executives$ = this.executivesService.executives$;
  }

  onImageChanged(event: { index: number; url: string }): void {
    this.executivesService.updateImage(event.index, event.url);
  }

  openModal(executive: Executive): void {
    this.selectedExecutive = executive;
  }

  closeModal(): void {
    this.selectedExecutive = null;
  }
}
