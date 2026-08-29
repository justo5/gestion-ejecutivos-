import { Component, Input } from '@angular/core';

// Una línea del gráfico (típicamente un ejecutivo), ya con color asignado.
export interface LineSeries {
  label: string;
  color: string;
  data: number[];
}

// Gráfico de líneas superpuestas (varias series, misma escala) para comparar
// tendencias entre grupos, ej. crecimiento de clientes por ejecutivo. A
// diferencia de app-area-chart no rellena el área bajo la curva: con varias
// líneas encimadas el relleno solo ensucia la lectura.
@Component({
  selector: 'app-multi-line-chart',
  standalone: false,
  templateUrl: './multi-line-chart.html',
  styleUrl: './multi-line-chart.scss',
})
export class MultiLineChart {
  @Input() series: LineSeries[] = [];
  @Input() height = 160;

  private readonly width = 560;
  private readonly padding = 8;

  get viewBox(): string {
    return `0 0 ${this.width} ${this.height}`;
  }

  // Escala compartida por todas las series: así el alto de cada línea es
  // comparable entre ejecutivos, no relativo a su propio mínimo/máximo.
  private get allValues(): number[] {
    const values = this.series.flatMap(s => s.data);
    return values.length ? values : [0];
  }

  private pointsFor(data: number[]): [number, number][] {
    const { width, height, padding } = this;
    if (data.length === 0) return [];
    const values = this.allValues;
    const max = Math.max(...values, 1);
    const min = Math.min(0, ...values);
    const range = max - min || 1;
    return data.map((v, i): [number, number] => [
      padding + (data.length === 1 ? 0 : (i / (data.length - 1)) * (width - padding * 2)),
      padding + (1 - (v - min) / range) * (height - padding * 2),
    ]);
  }

  linePath(data: number[]): string {
    return this.pointsFor(data)
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
      .join(' ');
  }

  lastPoint(data: number[]): [number, number] {
    const pts = this.pointsFor(data);
    return pts[pts.length - 1] ?? [0, 0];
  }
}
