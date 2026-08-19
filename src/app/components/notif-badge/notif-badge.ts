import { Component, Input } from '@angular/core';
import { NotifType } from '../../models/client-view.model';

interface BadgeCfg {
  bg: string;
  color: string;
  dot: string;
  label: string;
}

const BADGE_CONFIG: Record<NotifType, BadgeCfg> = {
  info:    { bg: 'var(--primary-light)', color: 'var(--primary)', dot: 'var(--primary)', label: 'Info' },
  success: { bg: 'var(--verde-bg)', color: 'var(--verde)', dot: 'var(--verde)', label: 'Éxito' },
  alert:   { bg: 'var(--naranja-bg)', color: 'var(--naranja)', dot: 'var(--naranja)', label: 'Alerta' },
  error:   { bg: 'var(--rojo-bg)', color: 'var(--rojo)', dot: 'var(--rojo)', label: 'Atención' },
};

@Component({
  selector: 'app-notif-badge',
  standalone: false,
  templateUrl: './notif-badge.html',
  styleUrl: './notif-badge.scss',
})
export class NotifBadge {
  @Input() type: NotifType = 'info';

  get cfg(): BadgeCfg {
    return BADGE_CONFIG[this.type];
  }
}
