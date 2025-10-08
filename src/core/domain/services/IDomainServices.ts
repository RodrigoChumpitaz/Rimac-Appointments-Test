import { Appointment } from '../entities/Appointment';

export interface INotificationService {
  publishAppointmentScheduled(appointment: Appointment): Promise<void>;
  publishAppointmentCompleted(appointment: Appointment): Promise<void>;
  publishAppointmentError(appointment: Appointment, error: string): Promise<void>;
}

export interface IEventService {
  emitAppointmentCompleted(appointmentId: string, countryISO: string, insuredId: string, scheduleId: number): Promise<void>;
  emitAppointmentFailed(appointmentId: string, countryISO: string, error: string): Promise<void>;
}

export interface IValidationService {
  validateInsuredId(insuredId: string): boolean;
  validateCountryCode(countryISO: string): boolean;
  validateAppointmentRequest(request: any): { isValid: boolean; errors: string[] };
}