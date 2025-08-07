import { Routes } from '@angular/router';
import { CustomerOnboardingComponent } from './customer-onboarding/customer-onboarding.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'customer-onboarding',
    pathMatch: 'full'
  },
  {
    path: 'customer-onboarding',
    component: CustomerOnboardingComponent
  },
  {
    path: '**',
    redirectTo: 'customer-onboarding'
  }
];
