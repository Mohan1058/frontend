import { Routes } from '@angular/router';

import { CustomerOnboardingComponent } from './customer-onboarding/customer-onboarding.component';
import { NgModule } from '@angular/core';
import { RouterModule} from '@angular/router';

const routes: Routes = [
  { path: 'customer-onboarding', component: CustomerOnboardingComponent }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
