import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CollectedBy = 'ejecutivo' | 'agencia';

export interface CobroRecord {
  planId: number | null;
  collectedByMonth: Record<string, CollectedBy>;
  paidMonths: string[];
  collectedInMonth: Record<string, string>;
  gastosByMonth: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class CobrosService {
  constructor(private http: HttpClient) {}

  updateRecord(clientId: string, partial: Partial<CobroRecord>): Observable<unknown> {
    return this.http.patch(`/api/clients/${clientId}/cobro`, partial);
  }
}
