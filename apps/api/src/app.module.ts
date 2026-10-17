import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthGuard } from './auth/auth.guard.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { RolesGuard } from './auth/roles.guard.js';
import { loggerParams } from './common/logger.js';
import { UserThrottlerGuard } from './common/user-throttler.guard.js';
import { validateEnv, type Env } from './config/env.js';
import { CoursesModule } from './courses/courses.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StudentsModule } from './students/students.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { TeachersModule } from './teachers/teachers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        loggerParams(config.get('NODE_ENV', { infer: true })),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    CoursesModule,
    AccountsModule,
    EnrollmentsModule,
    StudentsModule,
    TeachersModule,
    CalendarModule,
    AttendanceModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate (so limits can be per user), then rate limit, then check roles.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
