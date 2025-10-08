import { SQSEvent, SQSRecord } from 'aws-lambda';
import { Logger } from '../../shared/utils/Logger';
import { countryRepository } from '@/infrastructure/repositories';
import { processAppointmentUseCase } from '@/core/application/use-cases/ProcessCountryAppointmentUseCase';
import { eventService } from '@/infrastructure/messaging';
import { ProcessAppointmentDTO } from '@/core/application/dtos/AppointmentDTOs';

const logger = new Logger('AppointmentProcessorPE');

export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info('Processing Peru appointments', { 
    messageCount: event.Records.length 
  });

  const results: Array<{ success: boolean; messageId: string; appointmentId?: string }> = [];

  for (const record of event.Records) {
    try {
      const appointmentId = await processPeruAppointment(record);
      results.push({ success: true, messageId: record.messageId, appointmentId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error processing Peru appointment', {
        messageId: record.messageId,
        error: errorMessage
      });
      
      results.push({ success: false, messageId: record.messageId });
    }
  }
  
  try {
    await countryRepository.closeConnection('PE' as any);
  } catch (error) {
    logger.warn('Error closing MySQL connection for Peru', { error });
  }

  logger.info('Peru appointment processing completed', {
    totalMessages: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  });
};

async function processPeruAppointment(record: SQSRecord): Promise<string> {
  let appointmentData: ProcessAppointmentDTO = {} as ProcessAppointmentDTO;

  try {
    const sqsMessage = JSON.parse(record.body);
    
    if (sqsMessage.Message) {
      appointmentData = JSON.parse(sqsMessage.Message);
    } else {
      appointmentData = sqsMessage;
    }

    logger.info('Processing Peru appointment', { 
      appointmentId: appointmentData.appointmentId,
      insuredId: appointmentData.insuredId 
    });

    if (appointmentData.countryISO !== 'PE') {
      throw new Error(`Invalid country for Peru processor: ${appointmentData.countryISO}`);
    }

    if (!appointmentData.appointmentId || !appointmentData.insuredId || !appointmentData.scheduleId) {
      throw new Error('Missing required fields for appointment processing');
    }

    await processAppointmentUseCase.execute({
      appointmentId: appointmentData.appointmentId,
      insuredId: appointmentData.insuredId,
      scheduleId: appointmentData.scheduleId,
      countryISO: appointmentData.countryISO,
      schedule: appointmentData.schedule || {
        centerId: 0,
        specialityId: 0,
        medicId: 0,
        date: new Date().toISOString()
      },
      createdAt: appointmentData.createdAt
    });

    logger.info('Peru appointment processed successfully', {
      appointmentId: appointmentData.appointmentId
    });

    return appointmentData.appointmentId;

  } catch (error) {
    logger.error('Error in processPeruAppointment', {
      error,
      messageId: record.messageId,
      appointmentId: appointmentData?.appointmentId
    });
    
    if (appointmentData?.appointmentId) {
      try {
        await eventService.emitAppointmentFailed(
          appointmentData.appointmentId,
          'PE',
          error instanceof Error ? error.message : 'Processing failed'
        );
      } catch (emitError) {
        logger.error('Error emitting failure event', { emitError });
      }
    }

    throw error;
  }
}