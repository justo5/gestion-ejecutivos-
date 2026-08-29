import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CampaignAction {
  type: string;
  value: number;
}

export interface CampaignInsight {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  spend: number;
  impressions: number;
  reach: number;
  cpm: number | null;
  actions: CampaignAction[];
}

@Injectable({ providedIn: 'root' })
export class CampaignsService {
  constructor(private http: HttpClient) {}

  // Últimos 30 días, en vivo contra la Marketing API de Meta.
  getCampaigns(clientId: string): Observable<CampaignInsight[]> {
    return this.http.get<CampaignInsight[]>(`/api/clients/${clientId}/campaigns`);
  }
}
