import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Executive, ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-executives-list',
  standalone: false,
  templateUrl: './executives-list.html',
  styleUrl: './executives-list.scss',
})
export class ExecutivesList implements OnInit {
  executives$: Observable<Executive[]>;
  selectedExecutive: Executive | null = null;

  constructor(private executivesService: ExecutivesService) {
    this.executives$ = this.executivesService.executives$;
  }

  ngOnInit(): void {
    this.executivesService.refresh();
  }

  onImageChanged(event: { id: string; url: string }): void {
    this.executivesService.updateImage(event.id, event.url);
  }

  openModal(executive: Executive): void {
    this.selectedExecutive = executive;
  }

  closeModal(): void {
    this.selectedExecutive = null;
  }
}
