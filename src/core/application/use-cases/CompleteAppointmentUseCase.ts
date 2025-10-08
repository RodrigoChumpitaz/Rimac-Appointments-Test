import { IAppointmentRepository } from "@/core/domain/repositories/IAppointmentRepository";
import { AppointmentCompletedDTO } from "../dtos/AppointmentDTOs";
import { AppointmentStatus } from "@/core/domain/entities/Appointment";
import { appointmentRepository } from "@/infrastructure/repositories";

class CompleteAppointmentUseCase {
  constructor(
    private appointmentRepository: IAppointmentRepository
  ) {}

  async execute(completedData: AppointmentCompletedDTO): Promise<void> {
    await this.appointmentRepository.updateStatus(
      completedData.appointmentId,
      AppointmentStatus.COMPLETED,
      completedData.insuredId,
      completedData.scheduleId
    );
  }
}

export const completeAppointmentUseCase = new CompleteAppointmentUseCase(appointmentRepository);