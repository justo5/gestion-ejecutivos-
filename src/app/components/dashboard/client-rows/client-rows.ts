import { Component, Input } from '@angular/core';
import { ClientDetailRow } from '../../../models/dashboard.model';

// Lista de clientes (punto de estado, nombre, ejecutivo y un texto
// secundario) que se repite en todos los modales de detalle.
@Component({
  selector: 'app-dashboard-client-rows',
  standalone: false,
  templateUrl: './client-rows.html',
  styleUrl: './client-rows.scss',
})
export class DashboardClientRows {
  @Input() list: ClientDetailRow[] = [];
  @Input() emptyText = '';
}
