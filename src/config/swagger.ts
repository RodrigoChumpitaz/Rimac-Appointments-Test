import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RIMAC Medical Appointments API',
      version: '1.0.0',
      description: 'API para el sistema de agendamiento médico de RIMAC'
    },
    components: {
      schemas: {
        CreateAppointmentRequest: {
          type: 'object',
          required: ['insuredId', 'scheduleId', 'countryISO'],
          properties: {
            insuredId: {
              type: 'string',
              description: 'ID del asegurado (5 dígitos)',
              pattern: '^[0-9]{5}$',
              example: '12345'
            },
            scheduleId: {
              type: 'number',
              description: 'ID del horario médico',
              example: 101
            },
            countryISO: {
              type: 'string',
              enum: ['PE', 'CL'],
              description: 'Código ISO del país',
              example: 'PE'
            }
            // schedule: {
            //   $ref: '#/components/schemas/MedicalSchedule'
            // }
          }
        },
        MedicalSchedule: {
          type: 'object',
          properties: {
            scheduleId: { type: 'number', example: 101 },
            centerId: { type: 'number', example: 100 },
            specialityId: { type: 'number', example: 1 },
            medicId: { type: 'number', example: 1 },
            date: { type: 'string', format: 'date-time' }
          }
        },
        CreateAppointmentResponse: {
          type: 'object',
          properties: {
            appointmentId: {
              type: 'string',
              example: 'APPT-1728123456789-abc123'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'completed', 'cancelled', 'failed'],
              example: 'pending'
            },
            message: {
              type: 'string',
              example: 'Appointment created successfully'
            }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string', example: 'APPT-1728123456789-abc123' },
            insuredId: { type: 'string', example: '12345' },
            scheduleId: { type: 'number', example: 101 },
            countryISO: { type: 'string', enum: ['PE', 'CL'], example: 'PE' },
            status: { 
              type: 'string', 
              enum: ['pending', 'confirmed', 'completed', 'cancelled', 'failed'],
              example: 'pending' 
            },
            schedule: { $ref: '#/components/schemas/MedicalSchedule' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        GetAppointmentsResponse: {
          type: 'object',
          properties: {
            appointments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Appointment' }
            },
            totalCount: { type: 'number', example: 5 }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            message: { type: 'string', example: 'Campos requeridos: insuredId, scheduleId, countryISO' }
          }
        }
      }
    },
    paths: {
      '/appointments': {
        post: {
          summary: 'Crear nueva cita médica',
          description: 'Endpoint para crear una nueva cita médica para un asegurado',
          tags: ['Appointments'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateAppointmentRequest'
                }
              }
            }
          },
          responses: {
            '202': {
              description: 'Cita creada exitosamente (procesamiento asíncrono)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Appointment request submitted successfully'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Error de validación',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            },
            '500': {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/appointments/{insuredId}': {
        get: {
          summary: 'Obtener citas por asegurado',
          description: 'Obtiene todas las citas médicas de un asegurado específico',
          tags: ['Appointments'],
          parameters: [
            {
              in: 'path',
              name: 'insuredId',
              required: true,
              schema: {
                type: 'string',
                pattern: '^[0-9]{5}$'
              },
              description: 'ID del asegurado (5 dígitos)',
              example: '12345'
            },
            {
              in: 'query',
              name: 'status',
              schema: {
                type: 'string',
                enum: ['pending', 'confirmed', 'completed', 'cancelled', 'failed']
              },
              description: 'Filtrar por estado de la cita'
            },
            {
              in: 'query',
              name: 'limit',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100
              },
              description: 'Límite de resultados (máximo 100)'
            }
          ],
          responses: {
            '200': {
              description: 'Lista de citas del asegurado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/GetAppointmentsResponse'
                  }
                }
              }
            },
            '400': {
              description: 'Error de validación',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            },
            '500': {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);