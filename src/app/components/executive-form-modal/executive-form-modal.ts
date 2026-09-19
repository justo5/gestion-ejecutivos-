import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Executive, ExecutivesService } from '../../services/executives';

// Alta y edición de un ejecutivo. `executive` null = alta.
@Component({
  selector: 'app-executive-form-modal',
  standalone: false,
  templateUrl: './executive-form-modal.html',
  styleUrl: './executive-form-modal.scss',
})
export class ExecutiveFormModal implements OnInit {
  @Input() executive: Executive | null = null;
  @Output() closed = new EventEmitter<void>();

  name = '';
  squad = '';
  createAccess = false;
  email = '';
  password = '';

  submitting = false;
  error = '';

  constructor(private executivesService: ExecutivesService, private cdr: ChangeDetectorRef) {}

  get isEdit(): boolean {
    return !!this.executive;
  }

  ngOnInit(): void {
    if (this.executive) {
      this.name = this.executive.name;
      this.squad = this.executive.squad ?? '';
    }
  }

  submit(): void {
    const name = this.name.trim();
    if (!name) {
      this.error = 'El nombre es obligatorio.';
      return;
    }
    const squad = this.squad.trim() || null;

    const email = this.email.trim();
    if (!this.isEdit && this.createAccess) {
      if (!email || this.password.length < 6) {
        this.error = 'Para crear el acceso hacen falta un email y una contraseña de al menos 6 caracteres.';
        return;
      }
    }

    this.submitting = true;
    this.error = '';

    const request = this.executive
      ? this.executivesService.updateExecutive(this.executive.id, { name, squad })
      : this.executivesService.createExecutive({
          name,
          squad,
          ...(this.createAccess && { email, password: this.password }),
        });

    request.subscribe({
      next: () => {
        this.submitting = false;
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.error = this.messageFrom(err);
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    if (!this.submitting) this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.close();
  }

  // El backend responde 409 con un mensaje claro (nombre/email repetido).
  private messageFrom(err: HttpErrorResponse): string {
    const message = err.error?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
    return 'No se pudo guardar el ejecutivo. Intentá de nuevo.';
  }
}
