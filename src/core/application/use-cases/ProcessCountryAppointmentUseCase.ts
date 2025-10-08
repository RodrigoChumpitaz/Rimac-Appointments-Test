import { ICountryAppointmentRepository } from "@/core/domain/repositories/IAppointmentRepository";
import { IEventService } from "@/core/domain/services/IDomainServices";
import { ProcessAppointmentDTO } from "../dtos/AppointmentDTOs";
import { Appointment, AppointmentStatus } from "@/core/domain/entities/Appointment";
import { countryRepository } from "@/infrastructure/repositories";
import { eventService } from "@/infrastructure/messaging";

class ProcessCountryAppointmentUseCase {
  constructor(
    private countryRepository: ICountryAppointmentRepository,
    private eventService: IEventService
  ) {}

  async execute(appointmentData: ProcessAppointmentDTO): Promise<void> {
    try {
      const isAvailable = await this.countryRepository.validateScheduleAvailability(
        appointmentData.scheduleId, 
        appointmentData.countryISO
      );

      if (!isAvailable) {
        throw new Error('El schedule no está disponible');
      }

      const scheduleDetails = await this.countryRepository.getScheduleDetails(
        appointmentData.scheduleId,
        appointmentData.countryISO
      );

      if (!scheduleDetails) {
        throw new Error('No se encontraron detalles del schedule');
      }

      const appointment: Appointment = {
        appointmentId: appointmentData.appointmentId,
        insuredId: appointmentData.insuredId,
        scheduleId: appointmentData.scheduleId,
        countryISO: appointmentData.countryISO,
        status: AppointmentStatus.PROCESSING,
        schedule: {
          scheduleId: appointmentData.scheduleId,
          centerId: scheduleDetails.center_id,
          specialityId: scheduleDetails.speciality_id,
          medicId: scheduleDetails.medic_id,
          date: scheduleDetails.appointment_date
        },
        createdAt: appointmentData.createdAt,
        updatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };

      await this.countryRepository.saveProcessedAppointment(appointment);
      
      await this.countryRepository.markScheduleAsBooked(
        appointmentData.scheduleId,
        appointmentData.countryISO,
        appointmentData.appointmentId
      );

      await this.eventService.emitAppointmentCompleted(
        appointmentData.appointmentId,
        appointmentData.countryISO,
        appointmentData.insuredId,
        appointmentData.scheduleId
      );

    } catch (error) {
      await this.eventService.emitAppointmentFailed(
        appointmentData.appointmentId,
        appointmentData.countryISO,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}

export const processAppointmentUseCase = new ProcessCountryAppointmentUseCase(
  countryRepository,
  eventService
);