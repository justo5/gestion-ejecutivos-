import { Component, Input } from '@angular/core';

// Una porción del donut: mismo shape que BarItem (dashboard.ts) para poder
// pasarle directamente statusBars/rubroBars/planBars/countryBars/sexoBars sin
// transformarlos.
export interface DonutSlice {
  label: string;
  value: number;
  secondary: string;
  color: string;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

// Gráfico de torta (donut) para paneles part-to-whole con pocas categorías ya
// plegadas en "Otros" por el caller (ver buildBars en dashboard.ts): <=8
// porciones. No lo uses para series sin plegar (ej. por ejecutivo, que lista
// a todos a propósito): una torta con muchas porciones finas deja de leerse,
// mejor una barra ahí.
//
// El anillo se dibuja con <circle> + stroke-dasharray/dashoffset (una por
// porción) en vez de un solo <path> con arcos: cada porción es su propio
// elemento, así el hover/foco cae naturalmente sobre "la marca" (ver
// dataviz: "on segments, the mark is the hit target") sin tener que calcular
// hit-areas aparte.
@Component({
  selector: 'app-donut-chart',
  standalone: false,
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class DonutChart {
  @Input() items: DonutSlice[] = [];
  @Input() format: 'count' | 'money' = 'count';
  @Input() centerLabel = '';

  // Índice de la porción bajo el mouse/foco (null = nada resaltado).
  hoveredIndex: number | null = null;

  readonly size = 140;
  readonly radius = 52;
  readonly strokeWidth = 20;
  // Hueco entre porciones, en unidades de circunferencia (equivalente al gap
  // de 2px que separa segmentos tocándose en una barra apilada).
  private readonly gap = 3;

  get center(): number {
    return this.size / 2;
  }

  get viewBox(): string {
    return `0 0 ${this.size} ${this.size}`;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + i.value, 0);
  }

  get centerValueLabel(): string {
    return this.format === 'money' ? money(this.total) : `${this.total}`;
  }

  // Un segmento por porción: arco recorrido (start/raw, en longitud de arco)
  // y el largo ya achicado por el gap + su dashoffset acumulado. La rotación
  // -90° del <g> en el template hace que el primer segmento arranque a las
  // 12 en vez de a las 3 (default de stroke-dasharray sobre un círculo).
  get segments(): { start: number; raw: number; length: number; offset: number; slice: DonutSlice }[] {
    const c = this.circumference;
    const total = this.total || 1;
    let cursor = 0;
    return this.items.map(slice => {
      const raw = (slice.value / total) * c;
      const start = cursor;
      cursor += raw;
      return { start, raw, length: Math.max(raw - this.gap, 0), offset: -start, slice };
    });
  }

  pct(slice: DonutSlice): number {
    return this.total ? Math.round((slice.value / this.total) * 100) : 0;
  }

  isDimmed(index: number): boolean {
    return this.hoveredIndex !== null && this.hoveredIndex !== index;
  }

  onHover(index: number): void {
    this.hoveredIndex = index;
  }

  onLeave(): void {
    this.hoveredIndex = null;
  }

  get hoveredSegment(): { start: number; raw: number; slice: DonutSlice } | null {
    return this.hoveredIndex === null ? null : this.segments[this.hoveredIndex] ?? null;
  }

  // Posición del tooltip como % del viewBox (mismo criterio que
  // app-multi-line-chart): el punto medio del arco de la porción resaltada,
  // sobre el anillo.
  private midPointPct(seg: { start: number; raw: number }): [number, number] {
    const fraction = (seg.start + seg.raw / 2) / this.circumference;
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    const x = this.center + this.radius * Math.cos(angle);
    const y = this.center + this.radius * Math.sin(angle);
    return [(x / this.size) * 100, (y / this.size) * 100];
  }

  get tooltipLeftPct(): number {
    const seg = this.hoveredSegment;
    return seg ? this.midPointPct(seg)[0] : 0;
  }

  get tooltipTopPct(): number {
    const seg = this.hoveredSegment;
    return seg ? this.midPointPct(seg)[1] : 0;
  }
}
