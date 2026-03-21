export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ConSentido API Empresarial',
    version: '1.0.0',
    description:
      'API B2B para programar y gestionar mensajes SMS personalizados. ' +
      'Autenticación mediante API Key en el header `x-api-key`.',
    contact: { name: 'ConSentido', email: 'api@consentiido.com' },
  },
  servers: [
    { url: '/api/v1', description: 'Producción' },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key empresarial proporcionada por ConSentido',
      },
    },
    schemas: {
      MensajeProgramado: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          empresa_id: { type: 'string', format: 'uuid' },
          texto_final: { type: 'string', maxLength: 1600 },
          nombre_destinatario: { type: 'string', maxLength: 100 },
          nombre_remitente: { type: 'string', maxLength: 100 },
          celular_destinatario: { type: 'string', example: '******4567', description: 'Enmascarado' },
          celular_remitente: { type: 'string', example: '******8901', description: 'Enmascarado' },
          fecha_envio: { type: 'string', format: 'date' },
          estado: { type: 'string', enum: ['pendiente', 'enviado', 'fallido'] },
          referencia_pago: { type: 'string', nullable: true },
          recordatorio_enviado: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CrearMensajeRequest: {
        type: 'object',
        required: ['nombre_destinatario', 'nombre_remitente', 'texto_final', 'celular_destinatario', 'celular_remitente', 'fecha_envio'],
        properties: {
          nombre_destinatario: { type: 'string', minLength: 1, maxLength: 100, example: 'María' },
          nombre_remitente: { type: 'string', minLength: 1, maxLength: 100, example: 'Carlos' },
          texto_final: { type: 'string', minLength: 1, maxLength: 1600, example: 'Hola María\n\nFeliz cumpleaños...' },
          celular_destinatario: { type: 'string', pattern: '^3[0-9]{9}$', example: '3001234567' },
          celular_remitente: { type: 'string', pattern: '^3[0-9]{9}$', example: '3009876543' },
          fecha_envio: { type: 'string', format: 'date', example: '2025-12-25' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              fields: { type: 'object', additionalProperties: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  paths: {
    '/mensajes': {
      post: {
        summary: 'Crear mensaje programado',
        operationId: 'crearMensaje',
        tags: ['Mensajes'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CrearMensajeRequest' } } },
        },
        responses: {
          201: {
            description: 'Mensaje creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/MensajeProgramado' },
                    meta: { type: 'object', properties: { timestamp: { type: 'string', format: 'date-time' } } },
                  },
                },
              },
            },
          },
          400: { description: 'Payload inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          401: { description: 'API Key inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          429: { description: 'Rate limit excedido' },
        },
      },
      get: {
        summary: 'Listar mensajes de la empresa',
        operationId: 'listarMensajes',
        tags: ['Mensajes'],
        parameters: [
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limite', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Lista de mensajes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/MensajeProgramado' } },
                    meta: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'string', format: 'date-time' },
                        pagina: { type: 'integer' },
                        limite: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'API Key inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/mensajes/{id}': {
      get: {
        summary: 'Obtener mensaje por ID',
        operationId: 'obtenerMensaje',
        tags: ['Mensajes'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Mensaje encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/MensajeProgramado' },
                    meta: { type: 'object', properties: { timestamp: { type: 'string', format: 'date-time' } } },
                  },
                },
              },
            },
          },
          401: { description: 'API Key inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          404: { description: 'Mensaje no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};
