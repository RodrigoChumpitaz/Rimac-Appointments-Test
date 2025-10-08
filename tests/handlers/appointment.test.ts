import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@/core/application/use-cases/CreateAppointmentUseCase', () => ({
  createAppointmentUseCase: {
    execute: jest.fn()
  }
}));

jest.mock('@/core/application/use-cases/GetAppointmentUseCase', () => ({
  getAppointmentsUseCase: {
    execute: jest.fn()
  }
}));

import { handler } from '../../src/handlers/appointment';

const mockCreateAppointmentUseCase = require('@/core/application/use-cases/CreateAppointmentUseCase').createAppointmentUseCase;
const mockGetAppointmentsUseCase = require('@/core/application/use-cases/GetAppointmentUseCase').getAppointmentsUseCase;

function createMockEvent(httpMethod: string, path: string, body?: any, pathParameters?: any, queryStringParameters?: any): APIGatewayProxyEvent {
  return {
    httpMethod,
    path,
    resource: '',
    body: body ? JSON.stringify(body) : null,
    pathParameters: pathParameters || null,
    queryStringParameters: queryStringParameters || null,
    multiValueQueryStringParameters: null,
    headers: { 'Content-Type': 'application/json' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {} as any
  } as unknown as APIGatewayProxyEvent;
}

describe('Appointment Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OPTIONS Method', () => {
    it('should return 200 OK for OPTIONS request', async () => {
      const event = createMockEvent('OPTIONS', '/appointments');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(true);
      expect(parsedBody.data.message).toBe('OK');
    });
  });

  describe('POST /appointments - Create Appointment', () => {
    it('should create appointment successfully', async () => {
      const validData = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE'
      };

      mockCreateAppointmentUseCase.execute.mockResolvedValue({
        appointmentId: 'APPT-123',
        message: 'Appointment created successfully'
      });

      const event = createMockEvent('POST', '/appointments', validData);
      const result = await handler(event);

      expect(result.statusCode).toBe(202);
      expect(mockCreateAppointmentUseCase.execute).toHaveBeenCalledWith({
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const event = createMockEvent('POST', '/appointments', { scheduleId: 123 });
      
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('Campos requeridos');
      expect(mockCreateAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid insuredId format', async () => {
      const invalidData = {
        insuredId: '123',
        scheduleId: 100,
        countryISO: 'PE'
      };

      const event = createMockEvent('POST', '/appointments', invalidData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('insuredId debe tener exactamente 5 dígitos');
      expect(mockCreateAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid countryISO', async () => {
      const invalidData = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'AR'
      };

      const event = createMockEvent('POST', '/appointments', invalidData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('countryISO debe ser PE o CL');
      expect(mockCreateAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid scheduleId', async () => {
      const invalidData = {
        insuredId: '12345',
        scheduleId: -1,
        countryISO: 'PE'
      };

      const event = createMockEvent('POST', '/appointments', invalidData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('scheduleId debe ser un número positivo');
      expect(mockCreateAppointmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 400 for validation errors from use case', async () => {
      const validData = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE'
      };

      mockCreateAppointmentUseCase.execute.mockRejectedValue(new Error('Validation failed: Schedule not available'));

      const event = createMockEvent('POST', '/appointments', validData);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('Validation failed');
    });

    it('should return 500 for internal errors', async () => {
      const validData = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE'
      };

      mockCreateAppointmentUseCase.execute.mockRejectedValue(new Error('Database connection failed'));

      const event = createMockEvent('POST', '/appointments', validData);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('Error al procesar la solicitud de cita');
    });
  });

  describe('GET /appointments/:insuredId - Get Appointments', () => {
    it('should get appointments successfully', async () => {
      const mockAppointments = {
        appointments: [
          {
            appointmentId: 'APPT-123',
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE',
            status: 'SCHEDULED'
          }
        ],
        totalCount: 1
      };

      mockGetAppointmentsUseCase.execute.mockResolvedValue(mockAppointments);

      const event = createMockEvent('GET', '/appointments/12345', null, { insuredId: '12345' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetAppointmentsUseCase.execute).toHaveBeenCalledWith({
        insuredId: '12345',
        status: undefined,
        limit: undefined
      });
    });

    it('should get appointments with query parameters', async () => {
      const mockAppointments = {
        appointments: [],
        totalCount: 0
      };

      mockGetAppointmentsUseCase.execute.mockResolvedValue(mockAppointments);

      const event = createMockEvent(
        'GET', 
        '/appointments/12345', 
        null, 
        { insuredId: '12345' },
        { status: 'SCHEDULED', limit: '10' }
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetAppointmentsUseCase.execute).toHaveBeenCalledWith({
        insuredId: '12345',
        status: 'SCHEDULED',
        limit: 10
      });
    });

    it('should return 400 for invalid insuredId in path', async () => {
      const event = createMockEvent('GET', '/appointments/123', null, { insuredId: '123' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('insuredId debe tener exactamente 5 dígitos');
      expect(mockGetAppointmentsUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 500 for internal errors during get', async () => {
      mockGetAppointmentsUseCase.execute.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent('GET', '/appointments/12345', null, { insuredId: '12345' });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toContain('Error al obtener las citas');
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent('DELETE', '/appointments');
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.success).toBe(false);
      expect(parsedBody.error.message).toBe('Method not allowed');
    });
  });
});