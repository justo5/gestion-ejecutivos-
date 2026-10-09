import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { ConfigService, PlanConfig } from '../../services/config';
import { TaskStore } from '../../services/tasks';
import { LAST_DAY, MONTH_PLACEHOLDER, PlanTask, REPEATS, Repeat, WEEKDAYS, planTaskDay, planTaskWhen } from '../../models/task.model';
import { httpErrorMessage } from '../../utils/http-error';

// Sección del editor: General, todos los planes o un plan puntual.
interface SectionDef {
  key: string;
  label: string;
  hint: string;
  general: boolean;
  planId: number | null;
}

const MONTHLY_DAYS = Array.from({ length: LAST_DAY }, (_, i) => i + 1);
const WEEKLY_DAYS = WEEKDAYS.map((_, i) => i + 1);

// Editor de tareas automáticas. El admin edita las de la agencia (desde
// Configuración); un ejecutivo edita las suyas (desde Perfil) y ve las de la
// agencia como referencia, sin poder tocarlas.
@Component({
  selector: 'app-plan-tasks-editor',
  standalone: false,
  templateUrl: './plan-tasks-editor.html',
  styleUrl: './plan-tasks-editor.scss',
})
export class PlanTasksEditor implements OnInit {
  readonly MONTH = MONTH_PLACEHOLDER;
  readonly REPEATS = REPEATS;
  readonly REPEAT_IDS = Object.keys(REPEATS) as Repeat[];
  readonly dayLabel = planTaskDay;
  readonly when = planTaskWhen;

  private readonly plans = signal<PlanConfig[]>([]);
  // Las de la agencia, para un ejecutivo (solo lectura).
  private readonly agency = signal<PlanTask[]>([]);
  // Copia editable de las propias; se manda entera al guardar.
  readonly rows = signal<PlanTask[]>([]);
  private original = '[]';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');

  readonly sections = computed(() => {
    const defs: SectionDef[] = [
      {
        key: 'general',
        label: 'General',
        hint: this.isAdmin
          ? 'No son de ningún cliente: se cargan en la General de la agencia. Las mensuales siguen el mes del calendario (el Día 1 es el 1 de cada mes).'
          : 'No son de ningún cliente: se cargan en tu General. Las mensuales siguen el mes del calendario (el Día 1 es el 1 de cada mes).',
        general: true,
        planId: null,
      },
      {
        key: 'all',
        label: 'Todos los planes',
        hint: this.isAdmin ? 'Se cargan en todos los clientes que tienen un plan.' : 'Se cargan en todos tus clientes que tienen un plan.',
        general: false,
        planId: null,
      },
      ...this.plans().map((plan) => ({
        key: `plan-${plan.id}`,
        label: plan.name,
        hint: 'Además de las de todos los planes.',
        general: false,
        planId: plan.id,
      })),
    ];
    const inSection = (def: SectionDef) => (t: PlanTask) =>
      t.general === def.general && (def.general || t.planId === def.planId);
    return defs.map((def) => ({
      ...def,
      rows: this.rows().filter(inSection(def)),
      agency: this.agency().filter(inSection(def)),
    }));
  });

  constructor(
    private auth: AuthService,
    private configService: ConfigService,
    private store: TaskStore,
  ) {}

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  private get ownerId(): string | null {
    return this.isAdmin ? null : (this.auth.getUser()?.executiveId ?? null);
  }

  ngOnInit(): void {
    this.configService.plans$.subscribe((plans) => this.plans.set(plans));
    this.configService.refresh();
    this.store.fetchPlanTasks().subscribe({
      next: (tasks) => this.reset(tasks),
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las tareas automáticas.');
      },
    });
  }

  daysOf(repeat: Repeat): number[] {
    return repeat === 'weekly' ? WEEKLY_DAYS : MONTHLY_DAYS;
  }

  // Al cambiar cada cuánto se repite, arranca en el primer día (Día 1 o lunes).
  setRepeat(row: PlanTask, repeat: Repeat): void {
    row.repeat = repeat;
    row.day = 1;
  }

  add(section: { general: boolean; planId: number | null; key: string }): void {
    const row: PlanTask = {
      id: crypto.randomUUID(),
      executiveId: this.ownerId,
      general: section.general,
      planId: section.planId,
      title: '',
      repeat: 'monthly',
      day: 1,
    };
    this.rows.update((rows) => [...rows, row]);
    this.saved.set(false);
    setTimeout(() => document.getElementById(`plan-task-${row.id}`)?.focus());
  }

  remove(row: PlanTask): void {
    this.rows.update((rows) => rows.filter((r) => r !== row));
  }

  // Las que quedaron sin título se descartan.
  private result(): PlanTask[] {
    return this.rows()
      .map((r) => ({ ...r, title: r.title.trim() }))
      .filter((r) => r.title);
  }

  changed(): boolean {
    return JSON.stringify(this.result()) !== this.original;
  }

  save(): void {
    if (!this.changed() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.store.savePlanTasks(this.result()).subscribe({
      next: (tasks) => {
        this.saving.set(false);
        this.reset(tasks);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudieron guardar las tareas automáticas.'));
      },
    });
  }

  private reset(tasks: PlanTask[]): void {
    const owner = this.ownerId;
    const own = tasks.filter((t) => t.executiveId === owner);
    this.rows.set(own.map((t) => ({ ...t })));
    this.agency.set(owner === null ? [] : tasks.filter((t) => t.executiveId === null));
    this.original = JSON.stringify(this.result());
    this.loading.set(false);
  }
}
