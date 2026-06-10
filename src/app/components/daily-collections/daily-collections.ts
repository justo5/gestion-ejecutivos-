import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExecutivesService } from '../../services/executives';

export interface DailyExecutive {
  name: string;
  imageUrl: string;
  squad: string;
  todayClients: any[];
  businessNameKey: string;
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
            const clients = exec.clients;
            if (!clients.length) return null;

            const allKeys = new Set<string>();
            clients.forEach(c => Object.keys(c).forEach(k => allKeys.add(k)));
            const headers = [...allKeys];
            const diaKey = headers.find(h => /^dia$|^d[íi]a$/i.test(h.trim())) ?? '';
            const businessNameKey =
              headers.find(k => /negocio|empresa|business|razón|razon|nombre|cliente/i.test(k)) ??
              headers[0];

            if (!diaKey) return null;

            const todayClients = clients.filter(c => {
              const val = parseInt(String(c[diaKey] ?? ''), 10);
              return val === this.today;
            });

            if (!todayClients.length) return null;

            return {
              name: exec.name,
              imageUrl: exec.imageUrl,
              squad: exec.squad,
              todayClients,
              businessNameKey,
            } as DailyExecutive;
          })
          .filter((e): e is DailyExecutive => e !== null)
      )
    );
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
