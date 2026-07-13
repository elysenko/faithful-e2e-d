import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from 'src/auth/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'LIVENESS', description: 'Returns 200 if the app is running.' })
  @ApiResponse({ status: 200, description: 'App is live' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'READINESS',
    description: 'Returns 200 if the app and database are ready, 503 otherwise.',
  })
  @ApiResponse({ status: 200, description: 'App is ready' })
  @ApiResponse({ status: 503, description: 'App is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
    ]);
  }
}
