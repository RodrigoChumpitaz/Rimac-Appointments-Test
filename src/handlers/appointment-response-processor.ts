import { SQSEvent, SQSRecord } from 'aws-lambda';
import { Logger } from '../shared/utils/Logger';
import { completeAppointmentUseCase } from '@/core/application/use-cases/CompleteAppointmentUseCase';
import { appointmentRepository } from '@/infrastructure/repositories';
import { AppointmentStatus, CountryCode } from '@/core/domain/entities/Appointment';

const logger = new Logger('AppointmentResponseProcessor');

export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info('Processing appointment response messages', { 
    messageCount: event.Records.length 
  });

  const results: Array<{ success: boolean; messageId: string; error?: string }> = [];

  for (const record of event.Records) {
    try {
      await processResponseMessage(record);
      results.push({ success: true, messageId: record.messageId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error processing response message', {
        messageId: record.messageId,
        error: errorMessage,
        body: record.body
      });
      
      results.push({ 
        success: false, 
        messageId: record.messageId, 
        error: errorMessage 
      });
    }
  }

  logger.info('Appointment response processing completed', {
    totalMessages: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  });
};

async function processResponseMessage(record: SQSRecord): Promise<void> {
  try {
    let messageBody: any;
    
    try {
      messageBody = JSON.parse(record.body);
    } catch (error) {
      messageBody = record.body;
    }
    let appointmentData: any;
    if (messageBody.detail) {
      appointmentData = typeof messageBody.detail === 'string' 
        ? JSON.parse(messageBody.detail) 
        : messageBody.detail;
    } else {
      appointmentData = messageBody;
    }

    if (!appointmentData.appointmentId || !appointmentData.countryISO) {
      throw new Error('Missing required fields: appointmentId, countryISO');
    }

    const eventType = appointmentData.status || messageBody['detail-type'];
    
    if (eventType === 'completed' || eventType === 'Appointment Completed') {
      await handleCompletedAppointment(appointmentData);
    } else if (eventType === 'failed' || eventType === 'Appointment Failed') {
      await handleFailedAppointment(appointmentData);
    } else {
      logger.warn('Unknown event type received', { 
        eventType, 
        appointmentId: appointmentData.appointmentId 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Error in processResponseMessage', { 
      error: errorMessage,
      stack: errorStack,
      messageId: record.messageId 
    });
    throw error;
  }
}

async function handleCompletedAppointment(appointmentData: {
  appointmentId: string,
  countryISO: string,
  completedAt: string,
  status: string,
  insuredId: string,
  scheduleId: number
}): Promise<void> {
  try {
    await completeAppointmentUseCase.execute({
      appointmentId: appointmentData.appointmentId,
      insuredId: appointmentData.insuredId || 'UNKNOWN',
      scheduleId: appointmentData.scheduleId || 0,
      countryISO: appointmentData.countryISO as CountryCode,
      processedAt: appointmentData.completedAt || new Date().toISOString()
    });

    logger.info('Appointment marked as completed', {
      appointmentId: appointmentData.appointmentId,
      countryISO: appointmentData.countryISO
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Error marking appointment as completed', {
      error: errorMessage,
      stack: errorStack,
      appointmentId: appointmentData.appointmentId
    });
    throw error;
  }
}

async function handleFailedAppointment(appointmentData: any): Promise<void> {
  try {
    const repository = appointmentRepository as any;
    
    if (repository.updateByKeys) {
      await repository.updateByKeys(
        appointmentData.insuredId || 'UNKNOWN',
        appointmentData.appointmentId,
        AppointmentStatus.FAILED, 
        appointmentData.error || 'Processing failed'
      );
    } else {
      logger.warn('Cannot update failed appointment - method not available', {
        appointmentId: appointmentData.appointmentId
      });
    }

    logger.info('Appointment marked as failed', {
      appointmentId: appointmentData.appointmentId,
      countryISO: appointmentData.countryISO,
      error: appointmentData.error
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Error marking appointment as failed', {
      error: errorMessage,
      stack: errorStack,
      appointmentId: appointmentData.appointmentId
    });
    throw error;
  }
}