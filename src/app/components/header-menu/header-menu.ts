import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export type HeaderMenuAction =
  | 'ejecutivos'
  | 'cobros-hoy'
  | 'cobros'
  | 'balances'
  | 'clientes'
  | 'configuracion'
  | 'perfil';

interface MenuItem {
  label: string;
  action: HeaderMenuAction;
  icon: string;
}

@Component({
  selector: 'app-header-menu',
  templateUrl: './header-menu.html',
  standalone: false,
  styleUrl: './header-menu.scss'
})
export class HeaderMenu {
  @Input() isAdmin = false;
  @Output() select = new EventEmitter<HeaderMenuAction>();

  open = false;

  private readonly allItems: MenuItem[] = [
    { label: 'Ejecutivos', action: 'ejecutivos', icon: 'users' },
    { label: 'Cobros de Hoy', action: 'cobros-hoy', icon: 'cash' },
    { label: 'Resumen de Cobros', action: 'cobros', icon: 'receipt' },
    { label: 'Balances', action: 'balances', icon: 'chart' },
    { label: 'Clientes', action: 'clientes', icon: 'user' },
    { label: 'Configuración', action: 'configuracion', icon: 'gear' },
    { label: 'Perfil', action: 'perfil', icon: 'profile' }
  ];

  get items(): MenuItem[] {
    return this.isAdmin ? this.allItems : this.allItems.filter(i => i.action !== 'configuracion');
  }

  constructor(private host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.open = !this.open;
  }

  onItemClick(action: HeaderMenuAction): void {
    this.select.emit(action);
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open = false;
  }
}
