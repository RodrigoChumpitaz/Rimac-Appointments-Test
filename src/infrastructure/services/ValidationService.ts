import { Appointment } from '../../core/domain/entities/Appointment';
import { IValidationService } from '../../core/domain/services/IDomainServices';
import { SchemaValidator } from '../../shared/validation/SchemaValidator';
import { Logger } from '../../shared/utils/Logger';

export class ValidationService implements IValidationService {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ValidationService');
  }

  validateInsuredId(insuredId: string): boolean {
    return SchemaValidator.validateInsuredId(insuredId);
  }

  validateCountryCode(countryISO: string): boolean {
    return SchemaValidator.validateCountryCode(countryISO);
  }

  validateAppointmentRequest(request: any): { isValid: boolean; errors: string[] } {
    try {
      return SchemaValidator.validateAppointmentRequest(request);
    } catch (error) {
      this.logger.error('Error validating appointment request', { error, request });
      return {
        isValid: false,
        errors: ['Invalid request format']
      };
    }
  }
}