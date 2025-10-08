import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseBuilder, RequestValidator } from '../shared/utils/HttpUtils';
import { Logger } from '../shared/utils/Logger';
import { StatusCode } from '@/shared/types/statusCode';
import { CreateAppointmentRequestDTO } from '@/core/application/dtos/AppointmentDTOs';
import { createAppointmentUseCase } from '@/core/application/use-cases/CreateAppointmentUseCase';
import { getAppointmentsUseCase } from '@/core/application/use-cases/GetAppointmentUseCase';

const logger = new Logger('AppointmentHandler');

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Crear nueva cita médica
 *     description: Endpoint para crear una nueva cita médica para un asegurado
 *     tags:
 *       - Appointments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentRequest'
 *     responses:
 *       202:
 *         description: Cita creada exitosamente (procesamiento asíncrono)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Appointment request submitted successfully"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /appointments/{insuredId}:
 *   get:
 *     summary: Obtener citas por asegurado
 *     description: Obtiene todas las citas médicas de un asegurado específico
 *     tags:
 *       - Appointments
 *     parameters:
 *       - in: path
 *         name: insuredId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{5}$'
 *         description: ID del asegurado (5 dígitos)
 *         example: "12345"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['pending', 'confirmed', 'completed', 'cancelled', 'failed']
 *         description: Filtrar por estado de la cita
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Límite de resultados (máximo 100)
 *     responses:
 *       200:
 *         description: Lista de citas del asegurado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAppointmentsResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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
    logger.info('Processing create appointment request', {
      body: event.body,
      headers: event.headers,
      httpMethod: event.httpMethod
    });

    const requestBody = RequestValidator.parseRequestBody(event.body) as CreateAppointmentRequestDTO;
    
    logger.info('Parsed request body', { requestBody });

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