import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExecutivesService } from '../../services/executives';

export interface PendingCobro {
  clientId: string;
  fanpage: string;
  clientName: string;
  executiveName: string;
  contactDay: string;
  dayNum: number;
  plan: string | null;
  usd: string | null;
  ars: string | null;
  paid: boolean;
}

export interface CollectionsData {
  today: PendingCobro[];
  overdue: PendingCobro[];
  scheduled: PendingCobro[];
  isCurrentMonth: boolean;
  monthLabel: string;
  canGoNext: boolean;
}

@Component({
  selector: 'app-daily-collections',
  standalone: false,
  templateUrl: './daily-collections.html',
  styleUrl: './daily-collections.scss',
})
export class DailyCollections implements OnInit {
  private selectedDate$ = new BehaviorSubject<Date>(new Date());
  collections$!: Observable<CollectionsData>;

  constructor(private executivesService: ExecutivesService) {}

  ngOnInit(): void {
    this.collections$ = combineLatest([
      this.executivesService.executives$,
      this.selectedDate$,
    ]).pipe(
      map(([executives, selectedDate]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isCurrentMonth =
          selectedDate.getMonth() === now.getMonth() &&
          selectedDate.getFullYear() === now.getFullYear();

        const monthLabel = selectedDate.toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        });

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const canGoNext = selectedMonthStart < currentMonthStart;

        const selectedYearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        const todayList: PendingCobro[] = [];
        const overdueList: PendingCobro[] = [];
        const scheduledList: PendingCobro[] = [];

        for (const exec of executives) {
          for (const client of exec.clients) {
            if (client.contactDay === null) continue;

            // contactDay is a recurring day-of-month stored as YYYY-MM-DD.
            // The stored year-month reflects when the client was created/imported.
            // For the current month we only compare the day number (the stored month
            // may lag behind if the data was last imported in a prior month).
            // For past months we additionally gate on year-month so clients created
            // after the selected month are not shown there.
            const contactDate = new Date(client.contactDay + 'T00:00:00');
            const dayNum = contactDate.getDate();
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

            if (!isCurrentMonth) {
              const selYear = selectedDate.getFullYear();
              const selMonth = selectedDate.getMonth();
              if (
                contactDate.getFullYear() > selYear ||
                (contactDate.getFullYear() === selYear && contactDate.getMonth() > selMonth)
              ) continue;
            }

            const cobro: PendingCobro = {
              clientId: client.id,
              fanpage: client.fanpage ?? client.name,
              clientName: client.name,
              executiveName: exec.name,
              contactDay: client.contactDay,
              dayNum,
              plan: client.plan,
              usd: client.usd,
              ars: client.ars,
              paid: (client.cobro?.paidMonths ?? []).includes(selectedYearMonth),
            };

            if (isCurrentMonth) {
              const todayDay = today.getDate();
              if (dayNum === todayDay) todayList.push(cobro);
              else if (dayNum < todayDay) overdueList.push(cobro);
            } else {
              scheduledList.push(cobro);
            }
          }
        }

        overdueList.sort((a, b) => a.contactDay.localeCompare(b.contactDay));
        scheduledList.sort((a, b) => a.contactDay.localeCompare(b.contactDay));

        return { today: todayList, overdue: overdueList, scheduled: scheduledList, isCurrentMonth, monthLabel, canGoNext };
      })
    );

    this.executivesService.refresh();
  }

  prevMonth(): void {
    const d = this.selectedDate$.value;
    this.selectedDate$.next(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.selectedDate$.value;
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const now = new Date();
    if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      this.selectedDate$.next(next);
    }
  }
}
