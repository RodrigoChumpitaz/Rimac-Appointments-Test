import { DynamoDBAppointmentRepository } from "./DynamoDBAppointmentRepository";
import { MySQLCountryAppointmentRepository } from "./MySQLCountryAppointmentRepository";

export const appointmentRepository = new DynamoDBAppointmentRepository();
export const countryRepository = new MySQLCountryAppointmentRepository();