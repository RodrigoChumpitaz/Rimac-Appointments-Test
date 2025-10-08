import mysql from 'mysql2/promise';
import { Appointment, CountryCode } from '../../core/domain/entities/Appointment';
import { ICountryAppointmentRepository } from '../../core/domain/repositories/IAppointmentRepository';
import { CountryDatabaseFactory } from '../database/CountryDatabaseFactory';
import { Logger } from '../../shared/utils/Logger';

export class MySQLCountryAppointmentRepository implements ICountryAppointmentRepository {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('MySQLCountryAppointmentRepository');
  }

  private async getConnection(countryISO: CountryCode): Promise<mysql.Connection> {
    return await CountryDatabaseFactory.getConnection(countryISO);
  }

  async saveProcessedAppointment(appointment: Appointment): Promise<void> {
    try {
      const connection = await this.getConnection(appointment.countryISO);
      this.logger.info('Saving processed appointment to RDS', JSON.stringify(appointment));
      
      const insertQuery = `
        INSERT INTO processed_appointments (
          appointment_id, insured_id, schedule_id, country_iso,
          center_id, speciality_id, medic_id, appointment_date,
          status, created_at, updated_at
        ) VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        appointment.appointmentId,
        appointment.insuredId,
        appointment.scheduleId,
        appointment.countryISO,
        appointment.schedule?.centerId,
        appointment.schedule?.specialityId,
        appointment.schedule?.medicId,
        appointment.schedule?.date,
        appointment.status,
        appointment.createdAt,
        appointment.updatedAt
      ];

      await connection.execute(insertQuery, values);

      this.logger.info('Processed appointment saved to RDS', { 
        appointmentId: appointment.appointmentId,
        country: appointment.countryISO 
      });

    } catch (error) {
      this.logger.error('Error saving processed appointment to RDS', { 
        error, 
        appointmentId: appointment.appointmentId 
      });
      throw new Error(`Failed to save processed appointment: ${error}`);
    }
  }

  async validateScheduleAvailability(scheduleId: number, countryISO: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(countryISO as CountryCode);
      
      const checkScheduleQuery = `
        SELECT id, is_available 
        FROM medical_schedules 
        WHERE id = ? AND country_iso = ? AND is_available = 1
      `;

      const [scheduleRows] = await connection.execute(checkScheduleQuery, [scheduleId, countryISO]);
      const schedules = scheduleRows as any[];

      if (schedules.length === 0) {
        return false;
      }

      const checkBookingQuery = `
        SELECT COUNT(*) as booking_count
        FROM schedule_bookings 
        WHERE schedule_id = ? AND country_iso = ?
      `;

      const [bookingRows] = await connection.execute(checkBookingQuery, [scheduleId, countryISO]);
      const bookings = bookingRows as any[];

      return bookings[0].booking_count === 0;

    } catch (error) {
      this.logger.error('Error validating schedule availability', { 
        error, 
        scheduleId, 
        countryISO 
      });
      return false;
    }
  }

  async getScheduleDetails(scheduleId: number, countryISO: string): Promise<any> {
    try {
      const connection = await this.getConnection(countryISO as CountryCode);
      
      const detailQuery = `
        SELECT 
          ms.id as schedule_id,
          ms.appointment_date,
          mc.id as center_id,
          mc.name as center_name,
          mc.address as center_address,
          sp.id as speciality_id,
          sp.name as speciality_name,
          dr.id as medic_id,
          dr.first_name as medic_first_name,
          dr.last_name as medic_last_name
        FROM medical_schedules ms
        JOIN medical_centers mc ON ms.center_id = mc.id
        JOIN specialities sp ON ms.speciality_id = sp.id
        JOIN doctors dr ON ms.medic_id = dr.id
        WHERE ms.id = ? AND ms.country_iso = ?
      `;

      const [rows] = await connection.execute(detailQuery, [scheduleId, countryISO]);
      const details = rows as any[];

      return details.length > 0 ? details[0] : null;

    } catch (error) {
      this.logger.error('Error getting schedule details', { 
        error, 
        scheduleId, 
        countryISO 
      });
      return null;
    }
  }

  async markScheduleAsBooked(scheduleId: number, countryISO: string, appointmentId: string): Promise<void> {
    try {
      const connection = await this.getConnection(countryISO as CountryCode);
      
      await connection.beginTransaction();

      try {
        const updateQuery = `
          UPDATE medical_schedules 
          SET is_available = 0,
              updated_at = NOW()
          WHERE id = ? AND country_iso = ?
        `;
        
        await connection.execute(updateQuery, [scheduleId, countryISO]);

        const insertBookingQuery = `
          INSERT INTO schedule_bookings (
            schedule_id, appointment_id, country_iso, booked_at
          ) VALUES (?, ?, ?, NOW())
        `;

        await connection.execute(insertBookingQuery, [scheduleId, appointmentId, countryISO]);

        await connection.commit();

        this.logger.info('Schedule marked as booked', { 
          scheduleId, 
          appointmentId, 
          countryISO 
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }

    } catch (error) {
      this.logger.error('Error marking schedule as booked', { 
        error, 
        scheduleId, 
        appointmentId, 
        countryISO 
      });
      throw new Error(`Failed to mark schedule as booked: ${error}`);
    }
  }

  async closeConnection(countryISO?: CountryCode): Promise<void> {
    if (countryISO) {
      await CountryDatabaseFactory.closeConnection(countryISO);
    } else {
      await CountryDatabaseFactory.closeAllConnections();
    }
  }
}