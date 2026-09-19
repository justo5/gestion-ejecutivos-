import { Component, Input } from '@angular/core';
import { MonthDetail } from '../../../models/dashboard.model';

// Acordeón mes a mes (mes actual arriba) con los clientes que explican el
// valor de cada mes. Se recorre en orden inverso sin tocar el orden de los
// arrays de datos, que sigue siendo cronológico porque lo usa el gráfico
// (izquierda = más viejo). Guarda acá cuál mes está expandido.
@Component({
  selector: 'app-dashboard-month-accordion',
  standalone: false,
  templateUrl: './month-accordion.html',
  styleUrl: './month-accordion.scss',
})
export class DashboardMonthAccordion {
  @Input() monthLabels: string[] = [];
  @Input() details: MonthDetail[] = [];
  @Input() emptyText = '';

  expandedIndex: number | null = null;

  reversedIndexes(): number[] {
    return this.monthLabels.map((_, i) => i).reverse();
  }

  toggle(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }
}
