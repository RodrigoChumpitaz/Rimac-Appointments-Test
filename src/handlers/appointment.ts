import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseBuilder, RequestValidator } from '../shared/utils/HttpUtils';
import { Logger } from '../shared/utils/Logger';
import { StatusCode } from '@/shared/types/statusCode';
import { CreateAppointmentRequestDTO } from '@/core/application/dtos/AppointmentDTOs';
import { createAppointmentUseCase } from '@/core/application/use-cases/CreateAppointmentUseCase';
import { getAppointmentsUseCase } from '@/core/application/use-cases/GetAppointmentUseCase';

const logger = new Logger('AppointmentHandler');

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing appointment request', {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters
  });

  try {
    if (event.httpMethod === 'OPTIONS') {
      return ResponseBuilder.success({ message: 'OK' });
    }

    if (event.httpMethod === 'POST') {
      return await handleCreateAppointment(event);
    }

    if (event.httpMethod === 'GET' && event.pathParameters?.insuredId) {
      return await handleGetAppointments(event);
    }

    return ResponseBuilder.error('Method not allowed', StatusCode.METHOD_NOT_ALLOWED);

  } catch (error) {
    logger.error('Unhandled error in appointment handler', { error });
    return ResponseBuilder.internalError(
      'Error interno del servidor', 
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
};

async function handleCreateAppointment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const requestBody = RequestValidator.parseRequestBody(event.body) as CreateAppointmentRequestDTO;

    if (!requestBody.insuredId || !requestBody.scheduleId || !requestBody.countryISO) {
      return ResponseBuilder.badRequest('Campos requeridos: insuredId, scheduleId, countryISO');
    }

    if (!RequestValidator.validateInsuredId(requestBody.insuredId)) {
      return ResponseBuilder.badRequest('insuredId debe tener exactamente 5 dígitos');
    }

    if (!RequestValidator.validateCountryCode(requestBody.countryISO)) {
      return ResponseBuilder.badRequest('countryISO debe ser PE o CL');
    }

    if (!RequestValidator.validateScheduleId(requestBody.scheduleId)) {
      return ResponseBuilder.badRequest('scheduleId debe ser un número positivo');
    }

    const result = await createAppointmentUseCase.execute({
      insuredId: requestBody.insuredId,
      scheduleId: requestBody.scheduleId,
      countryISO: requestBody.countryISO,
      schedule: requestBody.schedule
    });

    logger.info('Appointment created successfully', { 
      appointmentId: result.appointmentId,
      insuredId: requestBody.insuredId 
    });

    return ResponseBuilder.accepted(result.message);

  } catch (error) {
    logger.error('Error creating appointment', { error });
    
    if (error instanceof Error) {
      if (error.message.includes('Validation failed') || error.message.includes('Country validation failed')) {
        return ResponseBuilder.badRequest(error.message);
      }
    }

    return ResponseBuilder.internalError('Error al procesar la solicitud de cita');
  }
}

async function handleGetAppointments(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const insuredId = event.pathParameters!.insuredId!;

    if (!RequestValidator.validateInsuredId(insuredId)) {
      return ResponseBuilder.badRequest('insuredId debe tener exactamente 5 dígitos');
    }

    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const limit = queryParams.limit ? parseInt(queryParams.limit) : undefined;

    const result = await getAppointmentsUseCase.execute({
      insuredId,
      status: status as any,
      limit
    });

    logger.info('Appointments retrieved successfully', { 
      insuredId,
      count: result.totalCount 
    });

    return ResponseBuilder.success(result);

  } catch (error) {
    logger.error('Error retrieving appointments', { error });
    return ResponseBuilder.internalError('Error al obtener las citas');
  }
}