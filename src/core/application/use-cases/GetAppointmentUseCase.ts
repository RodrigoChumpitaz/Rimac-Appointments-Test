import {
  GetAppointmentsRequestDTO,
  GetAppointmentsResponseDTO,
} from '../dtos/AppointmentDTOs';

import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { IValidationService } from '../../domain/services/IDomainServices';
import { appointmentRepository } from '@/infrastructure/repositories';
import { validationService } from '@/infrastructure/services';

class GetAppointmentsUseCase {
  constructor(
    private appointmentRepository: IAppointmentRepository,
    private validationService: IValidationService
  ) {}

  async execute(request: GetAppointmentsRequestDTO): Promise<GetAppointmentsResponseDTO> {
    if (!this.validationService.validateInsuredId(request.insuredId)) {
      throw new Error('Invalid insured ID format');
    }

    const appointments = await this.appointmentRepository.findByInsuredId(request.insuredId);

    const filteredAppointments = request.status 
      ? appointments.filter(apt => apt.status === request.status)
      : appointments;

    return {
      appointments: filteredAppointments.map(this.mapToSummaryDTO),
      totalCount: filteredAppointments.length
    };
  }

  private mapToSummaryDTO(appointment: Appointment) {
    return {
      appointmentId: appointment.appointmentId,
      insuredId: appointment.insuredId,
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      processedAt: appointment.processedAt,
      schedule: appointment.schedule
    };
  }
}

// const appointmentRepository = new DynamoDBAppointmentRepository();
// const validationService = new ValidationService();

export const getAppointmentsUseCase = new GetAppointmentsUseCase(
  appointmentRepository,
  validationService
);