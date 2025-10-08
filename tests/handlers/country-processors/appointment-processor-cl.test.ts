import { SQSEvent, SQSRecord } from 'aws-lambda';

jest.mock('@/infrastructure/repositories', () => ({
  countryRepository: {
    validateScheduleAvailability: jest.fn(),
    saveProcessedAppointment: jest.fn(),
    markScheduleAsBooked: jest.fn(),
    closeConnection: jest.fn()
  }
}));

jest.mock('@/infrastructure/messaging', () => ({
  eventService: {
    emitAppointmentCompleted: jest.fn(),
    emitAppointmentFailed: jest.fn()
  }
}));

jest.mock('@/core/application/use-cases/ProcessCountryAppointmentUseCase', () => ({
  processAppointmentUseCase: {
    execute: jest.fn()
  }
}));

import { handler } from '../../../src/handlers/country-processors/appointment-processor-cl';

const mockCountryRepository = require('@/infrastructure/repositories').countryRepository;
const mockProcessAppointmentUseCase = require('@/core/application/use-cases/ProcessCountryAppointmentUseCase').processAppointmentUseCase;

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
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:chile-appointments',
    awsRegion: 'us-east-1'
  } as SQSRecord;
}

function createMockSQSEvent(records: SQSRecord[]): SQSEvent {
  return {
    Records: records
  };
}

describe('Appointment Processor CL Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Processing Chile Appointments', () => {
    it('should process single appointment successfully', async () => {
      const appointmentData = {
        appointmentId: 'APPT-456',
        insuredId: '67890',
        scheduleId: 200,
        countryISO: 'CL',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T10:00:00.000Z'
        },
        createdAt: '2025-10-07T10:00:00.000Z'
      };

      mockProcessAppointmentUseCase.execute.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-1', appointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-456',
        insuredId: '67890',
        scheduleId: 200,
        countryISO: 'CL',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T10:00:00.000Z'
        },
        createdAt: '2025-10-07T10:00:00.000Z'
      });
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });

    it('should process appointments with SNS message format', async () => {
      const snsMessage = {
        Message: JSON.stringify({
          appointmentId: 'APPT-457',
          insuredId: '67891',
          scheduleId: 201,
          countryISO: 'CL',
          schedule: {
            centerId: 5,
            specialityId: 6,
            medicId: 7,
            date: '2025-10-08T11:00:00.000Z'
          },
          createdAt: '2025-10-07T11:00:00.000Z'
        })
      };

      mockProcessAppointmentUseCase.execute.mockResolvedValue(undefined);

      const record = createMockSQSRecord('msg-2', snsMessage);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).toHaveBeenCalledWith({
        appointmentId: 'APPT-457',
        insuredId: '67891',
        scheduleId: 201,
        countryISO: 'CL',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T11:00:00.000Z'
        },
        createdAt: '2025-10-07T11:00:00.000Z'
      });
    });

    it('should process multiple Chile appointments in batch', async () => {
      const appointments = [
        {
          appointmentId: 'APPT-456',
          insuredId: '67890',
          scheduleId: 200,
          countryISO: 'CL',
          schedule: {
            centerId: 5,
            specialityId: 6,
            medicId: 7,
            date: '2025-10-08T12:00:00.000Z'
          },
          createdAt: '2025-10-07T12:00:00.000Z'
        },
        {
          appointmentId: 'APPT-457',
          insuredId: '67891',
          scheduleId: 201,
          countryISO: 'CL',
          schedule: {
            centerId: 6,
            specialityId: 7,
            medicId: 8,
            date: '2025-10-08T13:00:00.000Z'
          },
          createdAt: '2025-10-07T13:00:00.000Z'
        }
      ];

      mockProcessAppointmentUseCase.execute.mockResolvedValue(undefined);

      const records = appointments.map((appointment, index) => 
        createMockSQSRecord(`msg-${index + 3}`, appointment)
      );
      const event = createMockSQSEvent(records);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });

    it('should handle processing errors gracefully', async () => {
      const appointmentData = {
        appointmentId: 'APPT-458',
        insuredId: '67892',
        scheduleId: 202,
        countryISO: 'CL',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T14:00:00.000Z'
        },
        createdAt: '2025-10-07T14:00:00.000Z'
      };

      mockProcessAppointmentUseCase.execute.mockRejectedValue(new Error('Schedule not available'));

      const record = createMockSQSRecord('msg-5', appointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).toHaveBeenCalled();
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });

    it('should handle invalid country code', async () => {
      const appointmentData = {
        appointmentId: 'APPT-459',
        insuredId: '67893',
        scheduleId: 203,
        countryISO: 'PE',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T15:00:00.000Z'
        },
        createdAt: '2025-10-07T15:00:00.000Z'
      };

      const record = createMockSQSRecord('msg-6', appointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).not.toHaveBeenCalled();
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });

    it('should handle missing required fields', async () => {
      const appointmentData = {
        appointmentId: 'APPT-460',
        countryISO: 'CL'
      };

      const record = createMockSQSRecord('msg-7', appointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).not.toHaveBeenCalled();
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });

    it('should handle connection close errors gracefully', async () => {
      const appointmentData = {
        appointmentId: 'APPT-461',
        insuredId: '67894',
        scheduleId: 204,
        countryISO: 'CL',
        schedule: {
          centerId: 5,
          specialityId: 6,
          medicId: 7,
          date: '2025-10-08T16:00:00.000Z'
        },
        createdAt: '2025-10-07T16:00:00.000Z'
      };

      mockProcessAppointmentUseCase.execute.mockResolvedValue(undefined);
      mockCountryRepository.closeConnection.mockRejectedValue(new Error('Connection close failed'));

      const record = createMockSQSRecord('msg-8', appointmentData);
      const event = createMockSQSEvent([record]);

      await handler(event);

      expect(mockProcessAppointmentUseCase.execute).toHaveBeenCalled();
      expect(mockCountryRepository.closeConnection).toHaveBeenCalledWith('CL');
    });
  });
});