import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusDot } from './components/status-dot/status-dot';
import { AreaChart } from './components/charts/area-chart/area-chart';

// Componentes que usan tanto el módulo principal (Clientes) como el
// dashboard, que se carga aparte: un componente no standalone solo puede
// declararse en un módulo, así que viven acá y cada uno lo importa.
@NgModule({
  declarations: [StatusDot, AreaChart],
  imports: [CommonModule],
  exports: [StatusDot, AreaChart],
})
export class SharedModule {}
