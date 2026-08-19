import { Component, Input } from '@angular/core';
import { ClientStatus } from '../../models/client-view.model';

@Component({
  selector: 'app-status-dot',
  standalone: false,
  templateUrl: './status-dot.html',
  styleUrl: './status-dot.scss',
})
export class StatusDot {
  @Input() status: ClientStatus = 'active';
}
