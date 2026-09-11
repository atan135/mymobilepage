import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.use(helmet())
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true
  })

  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
  Logger.log(`Server running on http://localhost:${port}/api`, 'Bootstrap')
}

void bootstrap()