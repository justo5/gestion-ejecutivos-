import { Component, Input } from '@angular/core';
import { MonthDetail } from '../../../models/dashboard.model';

// Acordeón mes a mes (mes actual arriba) con los clientes que explican el
// valor de cada mes. Se recorre en orden inverso sin tocar el orden de los
// arrays de datos, que sigue siendo cronológico porque lo usa el gráfico
// (izquierda = más viejo). Si el mes trae `groups`, muestra un segundo nivel
// con ese desglose y los clientes dentro de cada grupo. Guarda acá cuál mes
// (y cuál grupo dentro del mes) está expandido.
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
  expandedGroupLabel: string | null = null;

  reversedIndexes(): number[] {
    return this.monthLabels.map((_, i) => i).reverse();
  }

  toggle(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
    this.expandedGroupLabel = null;
  }

  toggleGroup(label: string): void {
    this.expandedGroupLabel = this.expandedGroupLabel === label ? null : label;
  }
}
