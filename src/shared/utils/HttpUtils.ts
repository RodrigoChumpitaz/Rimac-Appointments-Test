export interface APIResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class ResponseBuilder {
  static success<T>(data: T, statusCode: number = 200): APIResponse {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString()
      })
    };
  }

  static error(message: string, statusCode: number = 500, details?: any): APIResponse {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: {
          message,
          details,
          timestamp: new Date().toISOString()
        }
      })
    };
  }

  static accepted(message: string): APIResponse {
    return ResponseBuilder.success({ message }, 202);
  }

  static badRequest(message: string, details?: any): APIResponse {
    return ResponseBuilder.error(message, 400, details);
  }

  static notFound(message: string): APIResponse {
    return ResponseBuilder.error(message, 404);
  }

  static internalError(message: string, details?: any): APIResponse {
    return ResponseBuilder.error(message, 500, details);
  }
}

export class RequestValidator {
  static validateInsuredId(insuredId: string): boolean {
    const pattern = /^\d{5}$/;
    return pattern.test(insuredId);
  }

  static validateCountryCode(countryISO: string): boolean {
    return ['PE', 'CL'].includes(countryISO);
  }

  static validateScheduleId(scheduleId: any): boolean {
    return typeof scheduleId === 'number' && scheduleId > 0;
  }

  static parseRequestBody(body: string | null): any {
    if (!body) {
      throw new Error('Request body is required');
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }
}