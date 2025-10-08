# Sistema de Agendamiento Médico RIMAC

Sistema serverless para agendamiento de citas médicas que opera en Perú y Chile, utilizando AWS Lambda, DynamoDB, RDS MySQL, SNS, SQS y EventBridge.

## Arquitectura del Sistema

### Flujo de Procesamiento

1. **Registro de Cita** - Lambda `appointment` recibe petición HTTP y guarda en DynamoDB con estado "pending"
2. **Notificación** - Se publica mensaje a SNS con filtros por país (PE/CL)
3. **Enrutamiento** - SNS envía a SQS específicos por país (`SQS_PE` o `SQS_CL`)
4. **Procesamiento por País** - Lambdas `appointment_pe` o `appointment_cl` procesan y guardan en RDS MySQL
5. **Confirmación** - Se envía evento a EventBridge que reenvía a SQS de respuestas
6. **Actualización** - Lambda `appointment` actualiza estado a "completed" en DynamoDB

### Componentes Principales

- **API Gateway + Lambda**: Endpoints REST para registro y consulta de citas
- **DynamoDB**: Almacenamiento principal de citas con estados
- **SNS**: Distribución de mensajes con filtros por país
- **SQS**: Colas específicas por país + cola de respuestas
- **RDS MySQL**: Base de datos específica por país para procesamiento
- **EventBridge**: Orquestación de eventos de finalización

## Estructura del Proyecto

```
src/
├── core/                          # Dominio y lógica de negocio
│   ├── domain/
│   │   ├── entities/              # Entidades del dominio
│   │   │   ├── Appointment.ts     # Entidad principal de citas
│   │   │   └── Country.ts         # Entidades específicas por país
│   │   ├── repositories/          # Interfaces de repositorios
│   │   └── services/             # Interfaces de servicios de dominio
│   └── application/
│       ├── dtos/                 # Data Transfer Objects
│       └── use-cases/            # Casos de uso de la aplicación
├── handlers/                     # Handlers de AWS Lambda
│   ├── appointment.ts            # Handler principal (POST/GET)
│   ├── appointment-response-processor.ts  # Procesador de respuestas
│   └── country-processors/       # Procesadores específicos por país
│       ├── appointment-processor-pe.ts    # Procesador Perú
│       └── appointment-processor-cl.ts    # Procesador Chile
├── infrastructure/               # Implementaciones de infraestructura
│   ├── repositories/            # Repositorios DynamoDB y MySQL
│   ├── messaging/               # Servicios SNS y EventBridge
│   └── services/               # Implementaciones de servicios
└── shared/                     # Utilidades compartidas
    ├── utils/                  # Utilidades generales
    └── validation/             # Validadores y esquemas
```

## Endpoints de la API

### POST /appointments
Registra una nueva cita médica.

**Request Body:**
```json
{
  "insuredId": "01234",           // 5 dígitos, obligatorio
  "scheduleId": 100,              // ID del horario, obligatorio
  "countryISO": "PE",             // "PE" o "CL", obligatorio
  "schedule": {                   // Opcional, detalles del horario
    "centerId": 4,
    "specialityId": 3,
    "medicId": 4,
    "date": "2025-10-09T12:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Agendamiento en proceso"
  },
  "timestamp": "2025-10-06T10:30:00Z"
}
```

### GET /appointments/{insuredId}
Obtiene las citas de un asegurado específico.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "appointmentId": "APT-1728212345-abc123def",
        "insuredId": "01234",
        "scheduleId": 100,
        "countryISO": "PE",
        "status": "completed",
        "createdAt": "2025-10-06T10:30:00Z",
        "updatedAt": "2025-10-06T10:35:00Z",
        "processedAt": "2025-10-06T10:33:00Z",
        "schedule": {
          "centerId": 4,
          "specialityId": 3,
          "medicId": 4,
          "date": "2025-10-09T12:30:00Z"
        }
      }
    ],
    "totalCount": 1
  }
}
```

## Configuración y Despliegue

### Prerrequisitos

1. Node.js 18+
2. AWS CLI configurado
3. Serverless Framework
4. Base de datos MySQL (RDS) configurada

### Variables de Entorno

Copiar `.env.example` a `.env` y configurar con las variables compartidas por correo

### Instalación

```bash
npm install

npm run build

npm run deploy:dev

npm run deploy:prod
```

### Setup de Base de Datos

1. Crear instancia RDS MySQL
2. Ejecutar script de esquema:
```bash
mysql -h your-rds-endpoint -u admin -p < database/schema.sql
```

## Patrones de Diseño Implementados

- **Domain Driven Design (DDD)**: Separación clara entre dominio, aplicación e infraestructura
- **Repository Pattern**: Abstracción de acceso a datos
- **Dependency Injection**: Inyección de dependencias manual
- **Event Sourcing**: Eventos para comunicación entre componentes
- **CQRS**: Separación entre comandos (escritura) y consultas (lectura)
- **Circuit Breaker**: Manejo de fallos en llamadas externas

## Seguridad

- Validación estricta de entrada con esquemas JSON
- Sanitización de datos
- Principio de menor privilegio en IAM
- Encriptación en reposo (DynamoDB, RDS)
- Encriptación en tránsito (HTTPS, TLS)

## Escalabilidad

- Auto-scaling de Lambdas
- DynamoDB con billing on-demand
- SQS para desacoplar procesamiento
- Conexión pooling para RDS
- Dead Letter Queues para recuperación

## Testing

```bash
npm test

npm run test:watch

npm run lint
```

## Troubleshooting

### Problemas Comunes

1. **Error de conexión RDS**: Verificar security groups y variables de entorno
2. **Mensajes en DLQ**: Revisar logs de CloudWatch para errores específicos
3. **Timeouts**: Ajustar timeouts en configuración de Lambda

### Logs Importantes

- Lambda invocations: `/aws/lambda/{function-name}`
- API Gateway: `/aws/apigateway/{api-id}`
- Aplicación: Buscar por `appointmentId` o `insuredId`

## Licencia

Propietario - RIMAC Seguros