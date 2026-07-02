import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ConfigService, PlanConfig } from '../../services/config';

interface PlanRow {
  data: PlanConfig;
  editing: boolean;
  editName: string;
  editPrice: number;
  saving: boolean;
  error: string;
  confirmDelete: boolean;
}

@Component({
  selector: 'app-config-page',
  standalone: false,
  templateUrl: './config-page.html',
  styleUrl: './config-page.scss',
})
export class ConfigPage implements OnInit {
  planRows: PlanRow[] = [];

  newPlanName = '';
  newPlanPrice: number | null = null;
  addingPlan = false;
  addError = '';

  rubros: string[] = [];
  newRubro = '';
  rubrosSaved = false;

  constructor(private configService: ConfigService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.configService.plans$.subscribe(plans => {
      this.planRows = plans.map(p => this.toRow(p));
      this.cdr.detectChanges();
    });
    this.configService.rubros$.subscribe(rubros => {
      this.rubros = rubros.map(r => r.name);
    });
    this.configService.refresh();
  }

  private toRow(p: PlanConfig): PlanRow {
    return { data: p, editing: false, editName: p.name, editPrice: +p.price, saving: false, error: '', confirmDelete: false };
  }

  startEdit(row: PlanRow): void {
    row.editing = true;
    row.editName = row.data.name;
    row.editPrice = row.data.price;
    row.error = '';
  }

  cancelEdit(row: PlanRow): void {
    row.editing = false;
    row.error = '';
  }

  saveEdit(row: PlanRow): void {
    const name = row.editName.trim();
    if (!name) { row.error = 'El nombre es obligatorio.'; return; }
    row.saving = true;
    row.error = '';
    this.configService.updatePlan(row.data.id, name, row.editPrice ?? 0).subscribe({
      next: () => { row.saving = false; row.editing = false; },
      error: () => { row.saving = false; row.error = 'No se pudo guardar.'; },
    });
  }

  askDelete(row: PlanRow): void {
    row.confirmDelete = true;
    row.error = '';
  }

  cancelDelete(row: PlanRow): void {
    row.confirmDelete = false;
  }

  confirmDeletePlan(row: PlanRow): void {
    row.saving = true;
    this.configService.deletePlan(row.data.id).subscribe({
      error: () => { row.saving = false; row.confirmDelete = false; row.error = 'No se pudo eliminar.'; },
    });
  }

  addPlan(): void {
    const name = this.newPlanName.trim();
    if (!name) { this.addError = 'El nombre es obligatorio.'; return; }
    this.addingPlan = true;
    this.addError = '';
    this.configService.createPlan(name, this.newPlanPrice ?? 0).subscribe({
      next: () => {
        this.addingPlan = false;
        this.newPlanName = '';
        this.newPlanPrice = null;
      },
      error: () => {
        this.addingPlan = false;
        this.addError = 'No se pudo agregar el plan.';
      },
    });
  }

  addRubro(): void {
    const name = this.newRubro.trim();
    if (!name) return;
    if (this.rubros.some(r => r.toLowerCase() === name.toLowerCase())) {
      this.newRubro = '';
      return;
    }
    this.rubros = [...this.rubros, name];
    this.newRubro = '';
  }

  removeRubro(index: number): void {
    this.rubros = this.rubros.filter((_, i) => i !== index);
  }

  saveRubros(): void {
    this.configService.saveRubros(this.rubros).subscribe(() => {
      this.rubrosSaved = true;
      setTimeout(() => (this.rubrosSaved = false), 2000);
    });
  }
}
