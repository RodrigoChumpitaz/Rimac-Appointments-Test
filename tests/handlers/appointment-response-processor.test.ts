import { SQSEvent, SQSRecord } from 'aws-lambda';

jest.mock('@/core/application/use-cases/CompleteAppointmentUseCase', () => ({
  completeAppointmentUseCase: {
    execute: jest.fn()
  }
}));

jest.mock('@/infrastructure/repositories', () => ({
  appointmentRepository: {
    updateByKeys: jest.fn()
  }
}));

import { handler } from '../../src/handlers/appointment-response-processor';

const mockCompleteAppointmentUseCase = require('@/core/application/use-cases/CompleteAppointmentUseCase').completeAppointmentUseCase;
const mockAppointmentRepository = require('@/infrastructure/repositories').appointmentRepository;

function createMockSQSRecord(messageId: string, body: any): SQSRecord {
  return {
    messageId,
    receiptHandle: 'mock-receipt-handle',
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1609459200000',
      SenderId: 'mock-sender-id',
      ApproximateFirstReceiveTimestamp: '1609459200000'
    },
    messageAttributes: {},
    md5OfBody: 'mock-md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:appointment-responses',
    awsRegion: 'us-east-1'
  } as SQSRecord;
}

function createMockSQSEvent(records: SQSRecord[]): SQSEvent {
  return {
    Records: records
  };
}

describe('Appointment Response Processor Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Processing Appointment Completion', () => {
    it('should complete single appointment successfully', async () => {
      const completedAppointmentData = {
        appointmentId: 'APPT-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'completed',
        completedAt: '2025-10-07T10:05:00.000Z',
        rdsRecordId: 'rds-123'
      };

      mockCompleteAppointmentUseCase.execute.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-1', completedAppointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        processedAt: '2025-10-07T10:05:00.000Z'
      });
    });

    it('should complete appointments from EventBridge format', async () => {
      const eventBridgeMessage = {
        'detail-type': 'Appointment Completed',
        detail: {
          appointmentId: 'APPT-124',
          insuredId: '12346',
          scheduleId: 101,
          countryISO: 'CL',
          completedAt: '2025-10-07T10:10:00.000Z'
        }
      };

      mockCompleteAppointmentUseCase.execute.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-2', eventBridgeMessage);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-124',
        insuredId: '12346',
        scheduleId: 101,
        countryISO: 'CL',
        processedAt: '2025-10-07T10:10:00.000Z'
      });
    });

    it('should complete multiple appointments successfully', async () => {
      const appointments = [
        {
          appointmentId: 'APPT-123',
          insuredId: '12345',
          scheduleId: 100,
          countryISO: 'PE',
          status: 'completed',
          completedAt: '2025-10-07T10:05:00.000Z'
        },
        {
          appointmentId: 'APPT-456',
          insuredId: '67890',
          scheduleId: 200,
          countryISO: 'CL',
          status: 'completed',
          completedAt: '2025-10-07T10:15:00.000Z'
        }
      ];

      mockCompleteAppointmentUseCase.execute.mockResolvedValue(undefined);

      const records = appointments.map((appointment, index) => 
        createMockSQSRecord(`msg-${index + 3}`, appointment)
      );
      const event = createMockSQSEvent(records);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenNthCalledWith(1, {
        appointmentId: 'APPT-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        processedAt: '2025-10-07T10:05:00.000Z'
      });
      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenNthCalledWith(2, {
        appointmentId: 'APPT-456',
        insuredId: '67890',
        scheduleId: 200,
        countryISO: 'CL',
        processedAt: '2025-10-07T10:15:00.000Z'
      });
    });

    it('should handle completion errors gracefully', async () => {
      const completedAppointmentData = {
        appointmentId: 'APPT-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'completed'
      };

      mockCompleteAppointmentUseCase.execute.mockRejectedValue(new Error('Database update failed'));

      const record = createMockSQSRecord('msg-5', completedAppointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        processedAt: expect.any(String)
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const appointments = [
        {
          appointmentId: 'APPT-SUCCESS',
          countryISO: 'PE',
          status: 'completed'
        },
        {
          appointmentId: 'APPT-FAILED',
          countryISO: 'CL',
          status: 'completed'
        }
      ];

      mockCompleteAppointmentUseCase.execute
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Update failed'));

      const records = appointments.map((appointment, index) => 
        createMockSQSRecord(`msg-${index + 6}`, appointment)
      );
      const event = createMockSQSEvent(records);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('should process appointments with different countries', async () => {
      const appointments = [
        {
          appointmentId: 'APPT-PE-123',
          insuredId: '12345',
          scheduleId: 100,
          countryISO: 'PE',
          status: 'completed'
        },
        {
          appointmentId: 'APPT-CL-456',
          insuredId: '67890',
          scheduleId: 200,
          countryISO: 'CL',
          status: 'completed'
        }
      ];

      mockCompleteAppointmentUseCase.execute.mockResolvedValue(undefined);

      const records = appointments.map((appointment, index) => 
        createMockSQSRecord(`msg-${index + 8}`, appointment)
      );
      const event = createMockSQSEvent(records);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-PE-123',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        processedAt: expect.any(String)
      });
      expect(mockCompleteAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-CL-456',
        insuredId: '67890',
        scheduleId: 200,
        countryISO: 'CL',
        processedAt: expect.any(String)
      });
    });
  });

  describe('Processing Failed Appointments', () => {
    it('should handle failed appointment successfully', async () => {
      const failedAppointmentData = {
        appointmentId: 'APPT-FAILED-1',
        insuredId: '11111',
        countryISO: 'PE',
        status: 'failed',
        error: 'Schedule no longer available'
      };

      mockAppointmentRepository.updateByKeys.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-10', failedAppointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockAppointmentRepository.updateByKeys).toHaveBeenCalledWith(
        '11111',
        'APPT-FAILED-1',
        'failed',
        'Schedule no longer available'
      );
    });

    it('should handle EventBridge failed appointment format', async () => {
      const eventBridgeMessage = {
        'detail-type': 'Appointment Failed',
        detail: {
          appointmentId: 'APPT-FAILED-2',
          insuredId: '22222',
          countryISO: 'CL',
          error: 'Processing timeout'
        }
      };

      mockAppointmentRepository.updateByKeys.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-11', eventBridgeMessage);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockAppointmentRepository.updateByKeys).toHaveBeenCalledWith(
        '22222',
        'APPT-FAILED-2',
        'failed',
        'Processing timeout'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in message body', async () => {
      const record = {
        messageId: 'invalid-msg',
        receiptHandle: 'handle',
        body: 'invalid-json{',
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:queue',
        awsRegion: 'us-east-1'
      } as SQSRecord;

      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        insuredId: '33333'
      };

      const record = createMockSQSRecord('msg-12', incompleteData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle unknown event types', async () => {
      const unknownEventData = {
        appointmentId: 'APPT-UNKNOWN',
        countryISO: 'PE',
        status: 'unknown-status'
      };

      const record = createMockSQSRecord('msg-13', unknownEventData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockCompleteAppointmentUseCase.execute).not.toHaveBeenCalled();
      expect(mockAppointmentRepository.updateByKeys).not.toHaveBeenCalled();
    });
  });
});