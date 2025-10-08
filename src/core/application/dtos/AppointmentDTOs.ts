import { CountryCode, AppointmentStatus } from '../../domain/entities/Appointment';

export interface CreateAppointmentRequestDTO {
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  schedule?: {
    centerId: number;
    specialityId: number;
    medicId: number;
    date: string;
  };
}

export interface CreateAppointmentResponseDTO {
  appointmentId: string;
  status: AppointmentStatus;
  message: string;
  estimatedProcessingTime?: string;
}

export interface GetAppointmentsRequestDTO {
  insuredId: string;
  status?: AppointmentStatus;
  limit?: number;
}

export interface GetAppointmentsResponseDTO {
  appointments: AppointmentSummaryDTO[];
  totalCount: number;
}

export interface AppointmentSummaryDTO {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  schedule?: {
    centerId: number;
    specialityId: number;
    medicId: number;
    date: string;
  };
}

export interface ProcessAppointmentDTO {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  schedule: {
    centerId: number;
    specialityId: number;
    medicId: number;
    date: string;
  };
  createdAt: string;
}

export interface AppointmentCompletedDTO {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryCode;
  processedAt: string;
  rdsRecordId?: string;
}

export interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}