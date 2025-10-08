export interface MedicalSchedule {
  scheduleId: number;
  centerId: number;
  specialityId: number;
  medicId: number;
  date: string; // ISO 8601 format
}

export enum AppointmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum CountryCode {
  PERU = 'PE',
  CHILE = 'CL'
}

export interface Appointment {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  status: AppointmentStatus;
  schedule?: MedicalSchedule;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  errorDetails?: string;
  metadata?: Record<string, any>;
}

export interface AppointmentRequest {
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  schedule?: MedicalSchedule;
}

export interface AppointmentResponse {
  appointmentId: string;
  status: AppointmentStatus;
  message: string;
  estimatedProcessingTime?: string;
}

export interface InsuredInfo {
  insuredId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  countryISO: CountryCode;
  isActive: boolean;
}