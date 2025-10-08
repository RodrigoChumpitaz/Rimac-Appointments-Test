import mysql from 'mysql2/promise';
import { CountryCode } from '../../core/domain/entities/Appointment';
import { Logger } from '../../shared/utils/Logger';

export interface CountryDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: any;
}

export class CountryDatabaseFactory {
  private static readonly logger = new Logger('CountryDatabaseFactory');
  private static connections: Map<CountryCode, mysql.Connection> = new Map();

  static getDatabaseConfig(countryISO: CountryCode): CountryDatabaseConfig {
    const sslConfig = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

    switch (countryISO) {
      case CountryCode.PERU:
        return {
          host: process.env.RDS_HOST_PE || process.env.RDS_HOST || 'localhost',
          port: parseInt(process.env.RDS_PORT_PE || process.env.RDS_PORT || '3306'),
          user: process.env.RDS_USERNAME_PE || process.env.RDS_USERNAME || 'admin',
          password: process.env.RDS_PASSWORD_PE || process.env.RDS_PASSWORD || 'password',
          database: process.env.RDS_DATABASE_PE || 'rimac_appointments_pe',
          ssl: sslConfig
        };

      case CountryCode.CHILE:
        return {
          host: process.env.RDS_HOST_CL || process.env.RDS_HOST || 'localhost',
          port: parseInt(process.env.RDS_PORT_CL || process.env.RDS_PORT || '3306'),
          user: process.env.RDS_USERNAME_CL || process.env.RDS_USERNAME || 'admin',
          password: process.env.RDS_PASSWORD_CL || process.env.RDS_PASSWORD || 'password',
          database: process.env.RDS_DATABASE_CL || 'rimac_appointments_cl',
          ssl: sslConfig
        };

      default:
        throw new Error(`Unsupported country: ${countryISO}`);
    }
  }

  static async getConnection(countryISO: CountryCode): Promise<mysql.Connection> {
    if (this.connections.has(countryISO)) {
      const existingConnection = this.connections.get(countryISO)!;
      
      try {
        await existingConnection.ping();
        return existingConnection;
      } catch (error) {
        this.logger.warn(`Connection for ${countryISO} is dead, creating new one`, { error });
        this.connections.delete(countryISO);
      }
    }

    const config = this.getDatabaseConfig(countryISO);
    
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
        timezone: '+00:00' // UTC
      });

      this.connections.set(countryISO, connection);
      
      this.logger.info(`Database connection established for ${countryISO}`, {
        host: config.host,
        database: config.database
      });

      return connection;
      
    } catch (error) {
      this.logger.error(`Failed to connect to database for ${countryISO}`, {
        error,
        config: { ...config, password: '***masked***' }
      });
      throw new Error(`Database connection failed for ${countryISO}: ${error}`);
    }
  }

  static async closeConnection(countryISO: CountryCode): Promise<void> {
    const connection = this.connections.get(countryISO);
    if (connection) {
      try {
        await connection.end();
        this.connections.delete(countryISO);
        this.logger.info(`Database connection closed for ${countryISO}`);
      } catch (error) {
        this.logger.error(`Error closing connection for ${countryISO}`, { error });
      }
    }
  }

  static async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(country => 
      this.closeConnection(country)
    );
    
    await Promise.all(closePromises);
    this.logger.info('All database connections closed');
  }
}