import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: config.corsOrigins.length ? config.corsOrigins : false });
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
