import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Sharelyft API',
      description: 'API documentation for Workhub V1',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:9000',
        description: 'Local development server',
      },
    ],
  },
  apis: ['./src/routes/routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

export { swaggerDocs, swaggerUi };
