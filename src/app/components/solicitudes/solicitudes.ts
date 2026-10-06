import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  EDITABLE_LEAD_STATUSES,
  LEAD_INVERSION_LABELS,
  LEAD_STATUS_LABELS,
  Lead,
  LeadPatch,
  ExecutiveOption,
  LeadStatus,
  LeadsService,
  contactoLink,
  whatsappLink,
} from '../../services/leads';
import { ExecutivesService } from '../../services/executives';
import { ConfigService } from '../../services/config';
import { AuthService } from '../../services/auth';
import { httpErrorMessage } from '../../utils/http-error';

// Sección "Solicitudes": lo que entra por el formulario de la landing de
// Vamos Bien. Todos ven y editan estado/notas de sus solicitudes; el admin
// además asigna ejecutivo y las convierte en cliente.
@Component({
  selector: 'app-solicitudes',
  standalone: false,
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.scss',
})
export class Solicitudes implements OnInit {
  leads$!: Observable<Lead[]>;
  executives$!: Observable<ExecutiveOption[]>;

  readonly statusLabels = LEAD_STATUS_LABELS;
  readonly editableStatuses = EDITABLE_LEAD_STATUSES;
  readonly allStatuses = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
  readonly isAdmin: boolean;

  statusFilter: LeadStatus | '' = '';
  executiveFilter = '';

  // Estado por id de solicitud (no por fila), así el refresh que sigue a cada
  // guardado no pisa lo que se está haciendo en otra fila.
  editingNotesId: string | null = null;
  notesDraft = '';
  savingId: string | null = null;
  rowErrors: Record<string, string> = {};

  convertingLead: Lead | null = null;

  constructor(
    private leadsService: LeadsService,
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.isAdmin = auth.isAdmin();
  }

  ngOnInit(): void {
    this.leads$ = this.leadsService.leads$;
    this.executives$ = this.executivesService.executives$.pipe(
      map(executives =>
        executives
          .map(e => ({ id: e.id, name: e.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      ),
    );

    this.applyFilters();
    if (this.isAdmin) {
      // Para los desplegables de ejecutivo, plan y rubro (asignar / convertir).
      this.executivesService.refresh();
      this.configService.refresh();
    }
  }

  applyFilters(): void {
    this.leadsService.refresh({
      status: this.statusFilter,
      executiveId: this.isAdmin ? this.executiveFilter : undefined,
    });
  }

  fullName(lead: Lead): string {
    return `${lead.nombre} ${lead.apellido}`;
  }

  dateLabel(iso: string): string {
    return new Date(iso)
      .toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      .replace('.', '');
  }

  inversionLabel(lead: Lead): string {
    return LEAD_INVERSION_LABELS[lead.inversion] ?? lead.inversion;
  }

  whatsappHref(lead: Lead): string | null {
    return whatsappLink(lead.whatsapp);
  }

  contactoHref(lead: Lead): string | null {
    return contactoLink(lead.contacto);
  }

  // --- Edición en línea ---

  onStatusChange(lead: Lead, status: LeadStatus): void {
    this.save(lead, { status });
  }

  onExecutiveChange(lead: Lead, executiveId: string): void {
    this.save(lead, { executiveId: executiveId || null });
  }

  startNotes(lead: Lead): void {
    this.editingNotesId = lead.id;
    this.notesDraft = lead.notes ?? '';
    delete this.rowErrors[lead.id];
  }

  cancelNotes(): void {
    this.editingNotesId = null;
  }

  saveNotes(lead: Lead): void {
    this.save(lead, { notes: this.notesDraft.trim() || null }, () => (this.editingNotesId = null));
  }

  private save(lead: Lead, patch: LeadPatch, onDone?: () => void): void {
    this.savingId = lead.id;
    delete this.rowErrors[lead.id];
    this.leadsService.update(lead.id, patch).subscribe({
      next: () => {
        this.savingId = null;
        onDone?.();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.savingId = null;
        this.rowErrors[lead.id] = httpErrorMessage(err, 'No se pudo guardar. Intentá de nuevo.');
        // Vuelve a traer la lista para que los selects muestren el valor real.
        this.leadsService.refresh();
        this.cdr.markForCheck();
      },
    });
  }

  // --- Convertir en cliente ---

  openConvert(lead: Lead): void {
    this.convertingLead = lead;
  }

  closeConvert(): void {
    this.convertingLead = null;
  }

  trackById(_: number, lead: Lead): string {
    return lead.id;
  }
}
