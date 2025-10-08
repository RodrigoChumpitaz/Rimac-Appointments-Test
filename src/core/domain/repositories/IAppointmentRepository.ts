import { Appointment } from '../entities/Appointment';

export interface IAppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findById(appointmentId: string): Promise<Appointment | null>;
  findByInsuredId(insuredId: string): Promise<Appointment[]>;
  updateStatus(appointmentId: string, status: string, insuredId: string, scheduleId: number): Promise<void>;
  findByStatus(status: string): Promise<Appointment[]>;
  delete(appointmentId: string): Promise<void>;
}

export interface ICountryAppointmentRepository {
  saveProcessedAppointment(appointment: Appointment): Promise<void>;
  validateScheduleAvailability(scheduleId: number, countryISO: string): Promise<boolean>;
  getScheduleDetails(scheduleId: number, countryISO: string): Promise<any>;
  markScheduleAsBooked(scheduleId: number, countryISO: string, appointmentId: string): Promise<void>;
}