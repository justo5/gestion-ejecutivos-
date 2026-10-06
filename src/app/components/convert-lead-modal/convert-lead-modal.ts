import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ExecutiveOption, Lead, LeadsService } from '../../services/leads';
import { ConfigService, PlanConfig } from '../../services/config';
import { httpErrorMessage } from '../../utils/http-error';

// Compara rubros sin importar mayúsculas, acentos ni espacios: el del lead lo
// escribió la persona a mano ("estetica ") y el de la lista es "Estética".
const normalizeRubro = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

// Modal "Convertir en cliente" (solo admin): precarga ejecutivo, plan y rubro
// del lead, deja corregirlos y llama a POST /api/leads/:id/convert.
@Component({
  selector: 'app-convert-lead-modal',
  standalone: false,
  templateUrl: './convert-lead-modal.html',
  styleUrl: './convert-lead-modal.scss',
})
export class ConvertLeadModal implements OnInit, OnDestroy {
  @Input({ required: true }) lead!: Lead;
  @Input() executives: ExecutiveOption[] = [];
  @Output() closed = new EventEmitter<void>();

  plans: PlanConfig[] = [];
  rubroOptions: string[] = [];
  // Texto del lead cuando no coincide con ningún rubro configurado: se ofrece
  // igual como opción para no perder lo que escribió la persona.
  leadOnlyRubro: string | null = null;

  executiveId = '';
  planId: number | null = null;
  rubro = '';
  // Mientras el admin no toque el rubro, se vuelve a preseleccionar cuando
  // llega (o cambia) la lista de rubros.
  private rubroTouched = false;

  converting = false;
  error = '';

  private subs = new Subscription();

  constructor(
    private leadsService: LeadsService,
    private configService: ConfigService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.executiveId = this.lead.executiveId ?? '';
    this.planId = this.lead.planId;
    this.rubro = this.lead.rubro;

    this.subs.add(
      this.configService.plans$.subscribe(plans => {
        this.plans = plans;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.configService.rubros$.subscribe(rubros => {
        const names = rubros.map(r => r.name);
        const match = names.find(name => normalizeRubro(name) === normalizeRubro(this.lead.rubro));
        this.leadOnlyRubro = match ? null : this.lead.rubro;
        this.rubroOptions = match ? names : [...names, this.lead.rubro];
        if (!this.rubroTouched) this.rubro = match ?? this.lead.rubro;
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get fullName(): string {
    return `${this.lead.nombre} ${this.lead.apellido}`;
  }

  onRubroChange(value: string): void {
    this.rubro = value;
    this.rubroTouched = true;
  }

  convert(): void {
    if (!this.executiveId) {
      this.error = 'Elegí un ejecutivo para el cliente.';
      return;
    }
    this.converting = true;
    this.error = '';
    this.leadsService
      .convert(this.lead.id, {
        executiveId: this.executiveId,
        ...(this.planId != null && { planId: Number(this.planId) }),
        ...(this.rubro.trim() && { rubro: this.rubro.trim() }),
      })
      .subscribe({
        next: () => {
          this.converting = false;
          this.closed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.converting = false;
          this.error = httpErrorMessage(err, 'No se pudo convertir la solicitud. Intentá de nuevo.');
          this.cdr.markForCheck();
        },
      });
  }

  close(): void {
    if (!this.converting) this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
