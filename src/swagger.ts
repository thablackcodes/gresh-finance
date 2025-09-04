import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';


const options: swaggerJsdoc.Options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gresh Finance API',
      version: '1.0.0',
      description: 'API for Gresh Finance application',
    },
    servers: [
      {
        url: 'https://gresh-finance.onrender.com/api/v1',
        description: 'Prod development server',
      },
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'integer',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Bad request',
            },
            stack: {
              type: 'string',
              example: 'Error: Bad request\n    at ...',
            },
          },
        },
      },
    },
  },
  apis: ['./src/core/**/*.ts'],  
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {

  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve Swagger JSON
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};