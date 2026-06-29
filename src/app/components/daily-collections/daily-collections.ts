import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, ExecutivesService } from '../../services/executives';

export interface DailyExecutive {
  name: string;
  imageUrl: string;
  squad: string;
  todayClients: Client[];
}

@Component({
  selector: 'app-daily-collections',
  standalone: false,
  templateUrl: './daily-collections.html',
  styleUrl: './daily-collections.scss',
})
export class DailyCollections implements OnInit {
  today = new Date().getDate();
  todayLabel = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

  dailyExecutives$!: Observable<DailyExecutive[]>;
  expandedExecutive: string | null = null;

  constructor(private executivesService: ExecutivesService) {}

  ngOnInit(): void {
    this.dailyExecutives$ = this.executivesService.executives$.pipe(
      map(executives =>
        executives
          .map(exec => {
            const todayClients = exec.clients.filter(c => c.contactDay === this.today);
            if (!todayClients.length) return null;
            return { name: exec.name, imageUrl: exec.imageUrl, squad: exec.squad, todayClients } as DailyExecutive;
          })
          .filter((e): e is DailyExecutive => e !== null)
      )
    );

    this.executivesService.refresh();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  toggle(name: string): void {
    this.expandedExecutive = this.expandedExecutive === name ? null : name;
  }

  isExpanded(name: string): boolean {
    return this.expandedExecutive === name;
  }
}
