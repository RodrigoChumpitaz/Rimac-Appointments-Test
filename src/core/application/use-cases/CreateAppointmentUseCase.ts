import { IAppointmentRepository } from "@/core/domain/repositories/IAppointmentRepository";
import { INotificationService, IValidationService } from "@/core/domain/services/IDomainServices";
import { CreateAppointmentRequestDTO, CreateAppointmentResponseDTO } from "../dtos/AppointmentDTOs";
import { Appointment, AppointmentStatus } from "@/core/domain/entities/Appointment";
import { notificationService } from "@/infrastructure/messaging";
import { validationService } from "@/infrastructure/services";
import { appointmentRepository } from "@/infrastructure/repositories";

class CreateAppointmentUseCase {
  constructor(
    private appointmentRepository: IAppointmentRepository,
    private notificationService: INotificationService,
    private validationService: IValidationService
  ) {}

  async execute(request: CreateAppointmentRequestDTO): Promise<CreateAppointmentResponseDTO> {
    const validation = this.validationService.validateAppointmentRequest(request);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const appointment: Appointment = {
      appointmentId: this.generateAppointmentId(),
      insuredId: request.insuredId,
      scheduleId: request.scheduleId,
      countryISO: request.countryISO,
      status: AppointmentStatus.PENDING,
      schedule: request.schedule || {
        scheduleId: request.scheduleId,
        centerId: 100,
        specialityId: 1,
        medicId: 1,
        date: new Date().toISOString()
      } as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const savedAppointment = await this.appointmentRepository.save(appointment);

    await this.notificationService.publishAppointmentScheduled(savedAppointment);

    return {
      appointmentId: savedAppointment.appointmentId,
      status: savedAppointment.status,
      message: 'Agendamiento en proceso',
      estimatedProcessingTime: '2-5 minutes'
    };
  }

  private generateAppointmentId(): string {
    return `APT-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const createAppointmentUseCase = new CreateAppointmentUseCase(
  appointmentRepository,
  notificationService,
  validationService
);