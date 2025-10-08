import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand,
  QueryCommand, 
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { Appointment, AppointmentStatus } from '../../core/domain/entities/Appointment';
import { IAppointmentRepository } from '../../core/domain/repositories/IAppointmentRepository';
import { Logger } from '../../shared/utils/Logger';

export class DynamoDBAppointmentRepository implements IAppointmentRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly logger: Logger;

  constructor() {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.APPOINTMENTS_TABLE || 'appointments';
    this.logger = new Logger('DynamoDBAppointmentRepository');
  }

  async save(appointment: Appointment): Promise<Appointment> {
    try {
      const item = {
        ...appointment,
        pk: `INSURED#${appointment.insuredId}`,
        sk: `APPOINTMENT#${appointment.appointmentId}`,
        GSI1PK: `STATUS#${appointment.status}`,
        GSI1SK: appointment.createdAt,
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 año TTL
      };

      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(pk)'
      }));

      this.logger.info('Appointment saved successfully', { appointmentId: appointment.appointmentId });
      return appointment;
    } catch (error) {
      this.logger.error('Error saving appointment', { error, appointmentId: appointment.appointmentId });
      throw new Error(`Failed to save appointment: ${error}`);
    }
  }

  async findById(appointmentId: string): Promise<Appointment | null> {
    try {
      throw new Error('findById requires insuredId - use findByInsuredIdAndAppointmentId instead');
    } catch (error) {
      this.logger.error('Error finding appointment by ID', { error, appointmentId });
      return null;
    }
  }

  async findByInsuredId(insuredId: string): Promise<Appointment[]> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'insuredId = :insuredId',
        ExpressionAttributeValues: {
          ':insuredId': insuredId
        },
        ScanIndexForward: false
      }));

      const appointments = (result.Items || []).map(item => this.mapToAppointment(item));
      
      this.logger.info('Appointments retrieved successfully', { 
        insuredId, 
        count: appointments.length 
      });

      return appointments;
    } catch (error) {
      this.logger.error('Error finding appointments by insuredId', { error, insuredId });
      throw new Error(`Failed to retrieve appointments: ${error}`);
    }
  }

  async updateStatus(appointmentId: string, status: string, insuredId: string, scheduleId: number): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          insuredId: insuredId,
          appointmentId: appointmentId
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt' + (status === AppointmentStatus.COMPLETED ? ', processedAt = :processedAt' : ''),
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
          ...(status === AppointmentStatus.COMPLETED ? { ':processedAt': new Date().toISOString() } : {})
        }
      }));

      this.logger.info('Appointment status updated successfully', { appointmentId })
    } catch (error) {
      this.logger.error('Error updating appointment status', { error, appointmentId });
      throw error;
    }
  }

  async updateByKeys(insuredId: string, appointmentId: string, status: AppointmentStatus, errorDetails?: string): Promise<void> {
    try {
      const updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
      const expressionAttributeNames = { '#status': 'status' };
      const expressionAttributeValues: any = {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      };

      if (errorDetails) {
        updateExpression.concat(', errorDetails = :errorDetails');
        expressionAttributeValues[':errorDetails'] = errorDetails;
      }

      if (status === AppointmentStatus.COMPLETED) {
        updateExpression.concat(', processedAt = :processedAt');
        expressionAttributeValues[':processedAt'] = new Date().toISOString();
      }

      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          insuredId: insuredId,
          appointmentId: appointmentId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      this.logger.info('Appointment status updated successfully', { 
        appointmentId, 
        status 
      });
    } catch (error) {
      this.logger.error('Error updating appointment status', { 
        error, 
        appointmentId, 
        status 
      });
      throw new Error(`Failed to update appointment status: ${error}`);
    }
  }

  async findByStatus(status: string): Promise<Appointment[]> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status
        }
      }));

      return (result.Items || []).map(item => this.mapToAppointment(item));
    } catch (error) {
      this.logger.error('Error finding appointments by status', { error, status });
      throw new Error(`Failed to retrieve appointments by status: ${error}`);
    }
  }

  async delete(appointmentId: string): Promise<void> {
    throw new Error('method not implemented.');
  }

  private mapToAppointment(item: any): Appointment {
    return {
      appointmentId: item.appointmentId,
      insuredId: item.insuredId,
      scheduleId: item.scheduleId,
      countryISO: item.countryISO,
      status: item.status,
      schedule: item.schedule,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      processedAt: item.processedAt,
      errorDetails: item.errorDetails,
      metadata: item.metadata
    };
  }
}