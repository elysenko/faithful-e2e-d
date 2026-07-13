import * as v from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class EnvironmentVariables {
  @v.IsNotEmpty()
  @v.IsString()
  DATABASE_URL: string;

  @v.IsNotEmpty()
  @v.IsString()
  JWT_SECRET: string;

  @v.IsNotEmpty()
  @v.IsString()
  JWT_EXP: string;

  @v.IsOptional()
  @v.IsNumber()
  THROTTLE_TTL?: number;

  @v.IsOptional()
  @v.IsNumber()
  THROTTLE_LIMIT?: number;
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = v.validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    console.error('Invalid environment variables');
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
