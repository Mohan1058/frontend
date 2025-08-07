import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { FormsModule } from '@angular/forms';

// Interfaces to ensure type safety for the complex payload
interface Address {
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  nationality: string;
  address: Address;
  customer_type: string;
}

interface OnboardingPayload {
  customer: Customer;
  customer_type: string;
  priority: string;
  tags: string[];
  required_documents: string[];
}


@Component({
  selector: 'app-customer-onboarding',
  standalone: true,
  templateUrl: './customer-onboarding.component.html',
  styleUrls: ['./customer-onboarding.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class CustomerOnboardingComponent implements OnInit {
  onboardingForm: FormGroup;
  selectedFiles: File[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  // Static options for dropdowns and dynamic tags
  priorityOptions: string[] = ['high', 'medium', 'low'];
  customerTypeOptions: string[] = ['individual', 'corporate'];
  tagInput: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    // Initialize the complex form structure with nested groups and arrays
    this.onboardingForm = this.fb.group({
      customer: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        date_of_birth: ['', Validators.required],
        nationality: ['', Validators.required],
        address: this.fb.group({
          line1: ['', Validators.required],
          city: ['', Validators.required],
          state: ['', Validators.required],
          zip: ['', Validators.required],
          country: ['', Validators.required]
        }),
        // This nested customer_type is now kept in sync with the top-level one
        customer_type: ['individual', Validators.required]
      }),
      // ADDED: Top-level customer_type to match the backend payload structure
      customer_type: ['individual', Validators.required],
      priority: ['medium', Validators.required],
      tags: this.fb.array([]),
      required_documents: this.fb.array(['passport', 'utility_bill']) // Pre-filled required documents
    });
  }

  ngOnInit(): void {
    // Subscribe to changes on the top-level customer_type and sync with the nested one
    this.onboardingForm.get('customer_type')?.valueChanges.subscribe(value => {
      this.onboardingForm.get('customer.customer_type')?.setValue(value, { emitEvent: false });
    });

    // Also sync from the nested to the top-level in case of a CSV upload
    this.onboardingForm.get('customer.customer_type')?.valueChanges.subscribe(value => {
      this.onboardingForm.get('customer_type')?.setValue(value, { emitEvent: false });
    });
  }

  // Getters for form arrays to simplify template access
  get tags() {
    return this.onboardingForm.get('tags') as FormArray;
  }

  get required_documents() {
    return this.onboardingForm.get('required_documents') as FormArray;
  }

  // Function to add a tag from the input field to the form array
  addTag(): void {
    if (this.tagInput && this.tagInput.trim() !== '') {
      const tagControl = new FormControl(this.tagInput.trim());
      this.tags.push(tagControl);
      this.tagInput = ''; // Clear the input field
    }
  }

  // Function to remove a tag from the form array
  removeTag(index: number): void {
    this.tags.removeAt(index);
  }

  onCsvUpload(event: Event) {
    this.errorMessage = '';
    this.successMessage = '';
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;

    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        this.parseCsvAndFillForm(text);
      };
      reader.readAsText(file);
    } else {
      this.errorMessage = 'Please upload a valid CSV file.';
    }
  }

  parseCsvAndFillForm(csvText: string) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      this.errorMessage = 'CSV must have a header and at least one row.';
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const values = lines[1].split(',').map(v => v.trim());

    const data: { [key: string]: string } = {};
    headers.forEach((header, i) => {
      data[header] = values[i];
    });

    // Extracting nested address data from a flattened CSV format
    const addressData: Address = {
      line1: data['address_line1'] || '',
      city: data['address_city'] || '',
      state: data['address_state'] || '',
      zip: data['address_zip'] || '',
      country: data['address_country'] || ''
    };

    // Extracting tags and documents from a comma-separated string
    const tagsArray = (data['tags'] || '').split('|').map(tag => tag.trim()).filter(tag => tag !== '');
    const requiredDocsArray = (data['required_documents'] || '').split('|').map(doc => doc.trim()).filter(doc => doc !== '');

    // Updated to patch both the top-level and nested customer_type fields
    this.onboardingForm.patchValue({
      customer_type: data['customer_type'] || 'individual',
      customer: {
        name: data['name'] || '',
        email: data['email'] || '',
        phone: data['phone'] || '',
        date_of_birth: data['date_of_birth'] || '',
        nationality: data['nationality'] || '',
        address: addressData,
        customer_type: data['customer_type'] || 'individual'
      },
      priority: data['priority'] || 'medium',
    });

    // Clear and re-populate the tags FormArray
    this.tags.clear();
    tagsArray.forEach(tag => this.tags.push(new FormControl(tag)));

    // Clear and re-populate the required_documents FormArray
    this.required_documents.clear();
    requiredDocsArray.forEach(doc => this.required_documents.push(new FormControl(doc)));

    this.successMessage = 'Form filled from CSV.';
  }

  onFileChange(event: Event) {
    this.errorMessage = '';
    this.successMessage = '';
    const input = event.target as HTMLInputElement;
    const files: FileList | null = input.files;

    if (files) {
      // Check file sizes
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 15 * 1024 * 1024) {
          this.errorMessage = `${files[i].name} exceeds the 15MB limit. Please upload a smaller file.`;
          input.value = '';
          return;
        }
      }
      this.selectedFiles.push(...Array.from(files));
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.onboardingForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.onboardingForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isLoading = true;
    const formData = new FormData();

    // Append the entire form value as a JSON string
    formData.append('payload', JSON.stringify(this.onboardingForm.value));

    // Append all selected files
    this.selectedFiles.forEach(file => {
      formData.append('documents', file);
    });

    // The API URL now points to the Python FastAPI server.
    this.http.post<{ message: string; customer_id: string; case_id: string }>('http://127.0.0.1:8000/onboard-customer/', formData)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.successMessage = `Successfully onboarded! Customer ID: ${res.customer_id}, Case ID: ${res.case_id}`;
          this.isLoading = false;
          this.onboardingForm.reset();
          this.selectedFiles = [];
          this.tags.clear();
          this.required_documents.clear();
          // Re-populate required_documents with default values after reset
          this.required_documents.push(new FormControl('passport'));
          this.required_documents.push(new FormControl('utility_bill'));
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = `Error during onboarding: ${err.message}`;
          this.isLoading = false;
          console.error(err);
        }
      });
  }
}
