import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerOnboarding } from './customer-onboarding';

describe('CustomerOnboarding', () => {
  let component: CustomerOnboarding;
  let fixture: ComponentFixture<CustomerOnboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerOnboarding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerOnboarding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
