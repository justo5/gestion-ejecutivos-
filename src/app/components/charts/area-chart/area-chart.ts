import { Component, Input } from '@angular/core';

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

  get points(): [number, number][] {
    const d = this.data;
    const h = this.height;
    const { width, padding } = this;
    if (d.length === 0) return [];
    const max = Math.max(...d);
    const min = Math.min(...d);
    const range = max - min || 1;
    return d.map((v, i): [number, number] => [
      padding + (d.length === 1 ? 0 : (i / (d.length - 1)) * (width - padding * 2)),
      padding + (1 - (v - min) / range) * (h - padding * 2),
    ]);
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
}
