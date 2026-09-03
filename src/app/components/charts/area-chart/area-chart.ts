import { Component, Input } from '@angular/core';
import { ChartGoal } from '../multi-line-chart/multi-line-chart';

@Component({
  selector: 'app-area-chart',
  standalone: false,
  templateUrl: './area-chart.html',
  styleUrl: './area-chart.scss',
})
export class AreaChart {
  @Input() data: number[] = [];
  @Input() color = '#4f46e5';
  @Input() height = 140;
  @Input() label = 'chart';
  // Objetivo a futuro marcado sobre el gráfico (ver ChartGoal). Cuando está
  // presente se reserva una columna extra a la derecha de los datos reales,
  // mismo criterio que app-multi-line-chart, para dejar claro que es una
  // meta y no un dato más.
  @Input() goal: ChartGoal | null = null;

  private readonly width = 320;
  private readonly padding = 8;

  get viewBox(): string {
    return `0 0 ${this.width} ${this.height}`;
  }

  get gradId(): string {
    return `grad-${this.label}`;
  }

  get gradFill(): string {
    return `url(#grad-${this.label})`;
  }

  get chartLeft(): number {
    return this.padding;
  }

  get chartRight(): number {
    return this.width - this.padding;
  }

  get gridTop(): number {
    return this.padding;
  }

  get gridBottom(): number {
    return this.height - this.padding;
  }

  private get realColumns(): number {
    return this.data.length;
  }

  private get totalColumns(): number {
    return this.realColumns + (this.goal ? 1 : 0);
  }

  // Escala compartida por la curva y el objetivo (si hay uno), así la meta
  // queda dentro del rango visible en vez de salirse del gráfico.
  private get allValues(): number[] {
    const values = [...this.data];
    if (this.goal) values.push(this.goal.value);
    return values.length ? values : [0];
  }

  private xForColumn(index: number): number {
    const columns = this.totalColumns;
    if (columns <= 1) return this.chartLeft;
    return this.chartLeft + (index / (columns - 1)) * (this.chartRight - this.chartLeft);
  }

  private valueToY(value: number): number {
    const values = this.allValues;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    return this.padding + (1 - (value - min) / range) * (this.height - this.padding * 2);
  }

  get points(): [number, number][] {
    return this.data.map((v, i): [number, number] => [this.xForColumn(i), this.valueToY(v)]);
  }

  get linePath(): string {
    return this.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  }

  get areaPath(): string {
    const pts = this.points;
    if (pts.length === 0) return '';
    const last = pts[pts.length - 1];
    const h = this.height;
    const p = this.padding;
    return `${this.linePath} L ${last[0]} ${h - p} L ${pts[0][0]} ${h - p} Z`;
  }

  get lastPoint(): [number, number] {
    return this.points[this.points.length - 1] ?? [0, 0];
  }

  // Una línea vertical recesiva por mes (misma x que cada punto), para poder
  // ubicar a qué mes corresponde cada valor de un vistazo.
  get gridX(): number[] {
    return this.points.map(([x]) => x);
  }

  // Coordenadas del punto del objetivo: siempre en la última columna (la
  // reservada para él), a la altura de su valor.
  get goalX(): number {
    return this.xForColumn(this.totalColumns - 1);
  }

  get goalY(): number {
    return this.goal ? this.valueToY(this.goal.value) : 0;
  }

  // Si la meta queda muy arriba, la etiqueta se pone debajo del punto para
  // no salirse del gráfico.
  get goalLabelBelow(): boolean {
    return this.goalY - this.gridTop < 16;
  }
}
