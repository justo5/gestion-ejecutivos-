import { Component, ElementRef, Input, ViewChild } from '@angular/core';

// Una línea del gráfico (típicamente un ejecutivo), ya con color asignado.
export interface LineSeries {
  label: string;
  color: string;
  data: number[];
}

// Gráfico de líneas superpuestas (varias series, misma escala) para comparar
// tendencias entre grupos, ej. crecimiento de clientes por ejecutivo. A
// diferencia de app-area-chart no rellena el área bajo la curva: con varias
// líneas encimadas el relleno solo ensucia la lectura. Al pasar el mouse
// sobre una línea se resalta y aparece un tooltip con el ejecutivo, el mes y
// el valor en ese punto: con muchas series encimadas es la única forma
// práctica de saber "cuál es cuál".
@Component({
  selector: 'app-multi-line-chart',
  standalone: false,
  templateUrl: './multi-line-chart.html',
  styleUrl: './multi-line-chart.scss',
})
export class MultiLineChart {
  @Input() series: LineSeries[] = [];
  @Input() monthLabels: string[] = [];
  @Input() height = 160;

  @ViewChild('svgEl', { static: true }) private svgRef!: ElementRef<SVGSVGElement>;

  private readonly width = 560;
  private readonly padding = 8;

  // Índice de la serie bajo el mouse (null = nada resaltado) y mes más
  // cercano al cursor, para ubicar el punto y el tooltip.
  hoveredIndex: number | null = null;
  hoveredPointIndex = 0;

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

  pointAt(data: number[], index: number): [number, number] {
    const pts = this.pointsFor(data);
    return pts[index] ?? pts[pts.length - 1] ?? [0, 0];
  }

  isDimmed(index: number): boolean {
    return this.hoveredIndex !== null && this.hoveredIndex !== index;
  }

  get hoveredSeries(): LineSeries | null {
    return this.hoveredIndex === null ? null : this.series[this.hoveredIndex] ?? null;
  }

  get hoveredValue(): number | null {
    const s = this.hoveredSeries;
    return s ? s.data[this.hoveredPointIndex] ?? null : null;
  }

  get hoveredMonthLabel(): string | null {
    return this.monthLabels[this.hoveredPointIndex] ?? null;
  }

  // Posición del tooltip como % del viewBox: al usar preserveAspectRatio
  // "none" con ancho/alto 100%, un % del viewBox coincide con el % del
  // recuadro renderizado sin importar cómo se haya estirado.
  get tooltipLeftPct(): number {
    const s = this.hoveredSeries;
    if (!s) return 0;
    const [x] = this.pointAt(s.data, this.hoveredPointIndex);
    return (x / this.width) * 100;
  }

  get tooltipTopPct(): number {
    const s = this.hoveredSeries;
    if (!s) return 0;
    const [, y] = this.pointAt(s.data, this.hoveredPointIndex);
    return (y / this.height) * 100;
  }

  // Al mover el mouse sobre el gráfico: ubicamos el mes más cercano según la
  // posición horizontal (misma escala para todas las series) y, dentro de
  // ese mes, la serie cuyo punto queda verticalmente más cerca del cursor.
  onMouseMove(event: MouseEvent): void {
    const svg = this.svgRef.nativeElement;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height || this.series.length === 0) {
      this.hoveredIndex = null;
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width) * this.width;
    const y = ((event.clientY - rect.top) / rect.height) * this.height;

    const pointCount = this.series[0]?.data.length ?? 0;
    if (pointCount === 0) {
      this.hoveredIndex = null;
      return;
    }
    const step = pointCount > 1 ? (this.width - this.padding * 2) / (pointCount - 1) : 0;
    const rawIndex = step ? (x - this.padding) / step : 0;
    const pointIndex = Math.min(pointCount - 1, Math.max(0, Math.round(rawIndex)));

    const HIT_THRESHOLD = 18; // en unidades de viewBox, no píxeles reales
    let bestIndex: number | null = null;
    let bestDist = Infinity;
    this.series.forEach((s, i) => {
      const [, py] = this.pointAt(s.data, pointIndex);
      const dist = Math.abs(py - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    });

    this.hoveredPointIndex = pointIndex;
    this.hoveredIndex = bestDist <= HIT_THRESHOLD ? bestIndex : null;
  }

  onMouseLeave(): void {
    this.hoveredIndex = null;
  }
}
