import { Component, OnInit } from '@angular/core';
import { ConfigService, PlanConfig } from '../../services/config';

@Component({
  selector: 'app-config-page',
  standalone: false,
  templateUrl: './config-page.html',
  styleUrl: './config-page.scss',
})
export class ConfigPage implements OnInit {
  plans: PlanConfig[] = [];
  saved = false;

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.configService.plans$.subscribe(plans => {
      this.plans = plans.map(p => ({ ...p }));
    });
    this.configService.refresh();
  }

  save(): void {
    this.configService.savePlans(this.plans).subscribe(() => {
      this.saved = true;
      setTimeout(() => (this.saved = false), 2000);
    });
  }
}
