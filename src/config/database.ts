import { z } from 'zod';

const databaseConfigSchema = z.object({
  connectionString: z.string().url(),
  maxConnections: z.number().int().positive().default(20),
  idleTimeout: z.number().int().positive().default(30),
  connectionTimeout: z.number().int().positive().default(10),
});

const getDatabaseConfig = () => {
  const config = {
    connectionString: process.env.DATABASE_URL,
    maxConnections: process.env.DB_MAX_CONNECTIONS
      ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
      : 20,
    idleTimeout: process.env.DB_IDLE_TIMEOUT
      ? parseInt(process.env.DB_IDLE_TIMEOUT, 10)
      : 30,
    connectionTimeout: process.env.DB_CONNECTION_TIMEOUT
      ? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10)
      : 10,
  };

  try {
    return databaseConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(
        `Invalid database configuration: ${missingVars}. Please check your environment variables.`
      );
    }
    throw error;
  }
};

export const databaseConfig = getDatabaseConfig();

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
