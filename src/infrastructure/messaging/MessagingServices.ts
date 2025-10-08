import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Appointment } from '../../core/domain/entities/Appointment';
import { INotificationService, IEventService } from '../../core/domain/services/IDomainServices';
import { Logger } from '../../shared/utils/Logger';

export class SNSNotificationService implements INotificationService {
  private readonly snsClient: SNSClient;
  private readonly topicArn: string;
  private readonly logger: Logger;

  constructor() {
    this.snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.topicArn = process.env.APPOINTMENTS_TOPIC_ARN!;
    this.logger = new Logger('SNSNotificationService');
  }

  async publishAppointmentScheduled(appointment: Appointment): Promise<void> {
    try {
      const message = {
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        schedule: appointment.schedule,
        createdAt: appointment.createdAt,
        eventType: 'APPOINTMENT_SCHEDULED'
      };

      await this.snsClient.send(new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: appointment.countryISO
          },
          eventType: {
            DataType: 'String',
            StringValue: 'APPOINTMENT_SCHEDULED'
          }
        }
      }));

      this.logger.info('Appointment scheduled notification published', {
        appointmentId: appointment.appointmentId,
        countryISO: appointment.countryISO
      });

    } catch (error) {
      this.logger.error('Error publishing appointment scheduled notification', {
        error,
        appointmentId: appointment.appointmentId
      });
      throw new Error(`Failed to publish notification: ${error}`);
    }
  }

  async publishAppointmentCompleted(appointment: Appointment): Promise<void> {
    try {
      const message = {
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        processedAt: appointment.processedAt,
        eventType: 'APPOINTMENT_COMPLETED'
      };

      await this.snsClient.send(new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: appointment.countryISO
          },
          eventType: {
            DataType: 'String',
            StringValue: 'APPOINTMENT_COMPLETED'
          }
        }
      }));

      this.logger.info('Appointment completed notification published', {
        appointmentId: appointment.appointmentId
      });

    } catch (error) {
      this.logger.error('Error publishing appointment completed notification', {
        error,
        appointmentId: appointment.appointmentId
      });
      throw error;
    }
  }

  async publishAppointmentError(appointment: Appointment, error: string): Promise<void> {
    try {
      const message = {
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        countryISO: appointment.countryISO,
        error,
        eventType: 'APPOINTMENT_ERROR'
      };

      await this.snsClient.send(new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: appointment.countryISO
          },
          eventType: {
            DataType: 'String',
            StringValue: 'APPOINTMENT_ERROR'
          }
        }
      }));

      this.logger.info('Appointment error notification published', {
        appointmentId: appointment.appointmentId,
        error
      });

    } catch (err) {
      this.logger.error('Error publishing appointment error notification', {
        error: err,
        appointmentId: appointment.appointmentId
      });
    }
  }
}

export class EventBridgeService implements IEventService {
  private readonly eventBridgeClient: EventBridgeClient;
  private readonly logger: Logger;

  constructor() {
    this.eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.logger = new Logger('EventBridgeService');
  }

  async emitAppointmentCompleted(appointmentId: string, countryISO: string, insuredId: string, scheduleId: number): Promise<void> {
    try {
      const event = {
        Source: 'rimac.appointments',
        DetailType: 'Appointment Completed',
        Detail: JSON.stringify({
          appointmentId,
          countryISO,
          insuredId,
          scheduleId,
          completedAt: new Date().toISOString(),
          status: 'completed'
        }),
        Time: new Date()
      };

      await this.eventBridgeClient.send(new PutEventsCommand({
        Entries: [event]
      }));

      this.logger.info('Appointment completed event emitted', {
        appointmentId,
        countryISO
      });

    } catch (error) {
      this.logger.error('Error emitting appointment completed event', {
        error,
        appointmentId,
        countryISO
      });
      throw new Error(`Failed to emit completion event: ${error}`);
    }
  }

  async emitAppointmentFailed(appointmentId: string, countryISO: string, error: string): Promise<void> {
    try {
      const event = {
        Source: 'rimac.appointments',
        DetailType: 'Appointment Failed',
        Detail: JSON.stringify({
          appointmentId,
          countryISO,
          error,
          failedAt: new Date().toISOString(),
          status: 'failed'
        }),
        Time: new Date()
      };

      await this.eventBridgeClient.send(new PutEventsCommand({
        Entries: [event]
      }));

      this.logger.info('Appointment failed event emitted', {
        appointmentId,
        countryISO,
        error
      });

    } catch (err) {
      this.logger.error('Error emitting appointment failed event', {
        error: err,
        appointmentId,
        countryISO
      });
    }
  }
}