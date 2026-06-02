import { Component, OnInit, signal } from '@angular/core';
import { ExecutivesService } from './services/executives';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('gestion-juniors');

  constructor(private executivesService: ExecutivesService) {}

  ngOnInit(): void {
    this.executivesService.loadFromGoogleSheets();
  }
}
