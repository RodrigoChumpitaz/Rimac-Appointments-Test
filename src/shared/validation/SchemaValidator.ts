import Joi from "joi";

export const appointmentRequestSchema = Joi.object({
  insuredId: Joi.string().pattern(/^\d{5}$/).required()
    .messages({
      'string.pattern.base': 'insuredId debe ser una cadena de 5 dígitos',
      'any.required': 'insuredId es obligatorio'
    }),
  scheduleId: Joi.number().integer().min(1).required()
    .messages({
      'number.base': 'scheduleId debe ser un número',
      'number.integer': 'scheduleId debe ser un número entero',
      'number.min': 'scheduleId debe ser al menos 1',
      'any.required': 'scheduleId es obligatorio'
    }),
  countryISO: Joi.string().valid('PE', 'CL').required()
    .messages({
      'any.only': 'countryISO debe ser "PE" o "CL"',
      'any.required': 'countryISO es obligatorio'
    }),
  schedule: Joi.object({
    centerId: Joi.number().integer().min(1).required()
      .messages({
        'number.base': 'centerId debe ser un número',
        'number.integer': 'centerId debe ser un número entero',
        'number.min': 'centerId debe ser al menos 1',
        'any.required': 'centerId es obligatorio'
      }),
    specialityId: Joi.number().integer().min(1).required()
      .messages({
        'number.base': 'specialityId debe ser un número',
        'number.integer': 'specialityId debe ser un número entero',
        'number.min': 'specialityId debe ser al menos 1',
        'any.required': 'specialityId es obligatorio'
      }),
    medicId: Joi.number().integer().min(1).required()
      .messages({
        'number.base': 'medicId debe ser un número',
        'number.integer': 'medicId debe ser un número entero',
        'number.min': 'medicId debe ser al menos 1',
        'any.required': 'medicId es obligatorio'
      }),
    date: Joi.string().isoDate().required()
      .messages({
        'string.isoDate': 'date debe estar en formato ISO 8601',
        'any.required': 'date es obligatorio'
      })
  }).optional()
    .messages({
      'object.base': 'schedule debe ser un objeto'
    })
})

export class SchemaValidator {
  private static appointmentRequestValidator = appointmentRequestSchema;

  static validateAppointmentRequest(data: any): { isValid: boolean; errors: string[] } {
    const { error } = this.appointmentRequestValidator.validate(data);

    if (error) {
      for (const detail of error.details) {
        const field = detail.path.join('.') || detail.type;
        return {
          isValid: false,
          errors: [`${field}: ${detail.message}`]
        };
      }
    }

    return {
      isValid: !error,
      errors: error ? error.details.map(detail => `${detail.path.join('.')}: ${detail.message}`) : []
    };
  }

  static validateInsuredId(insuredId: string): boolean {
    return /^\d{5}$/.test(insuredId);
  }

  static validateCountryCode(countryISO: string): boolean {
    return ['PE', 'CL'].includes(countryISO);
  }
}