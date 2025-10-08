export interface CountrySpecificData {
  countryISO: string;
  timezone: string;
  businessHours: {
    start: string;
    end: string;
  };
  processingRules: CountryProcessingRules;
}

export interface CountryProcessingRules {
  maxAdvanceDays: number;
  minAdvanceHours: number;
  allowWeekendAppointments: boolean;
  requiresInsuranceValidation: boolean;
  notificationChannels: NotificationChannel[];
  specialValidations?: Record<string, any>;
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp'
}

export interface MedicalCenter {
  centerId: number;
  name: string;
  address: string;
  city: string;
  countryISO: string;
  timezone: string;
  isActive: boolean;
  specialities: number[];
}

export interface MedicalSpeciality {
  specialityId: number;
  name: string;
  description: string;
  averageConsultationTime: number;
  requiresPreparation: boolean;
  isActive: boolean;
}

export interface Doctor {
  medicId: number;
  firstName: string;
  lastName: string;
  specialityIds: number[];
  licenseNumber: string;
  centerIds: number[];
  isActive: boolean;
  workingHours: DoctorWorkingHours[];
}

export interface DoctorWorkingHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  centerId: number;
}