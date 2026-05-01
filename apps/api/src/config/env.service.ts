import { Injectable, Logger } from '@nestjs/common';
import { type Env, EnvSchema } from '@wa-kijo/shared';

@Injectable()
export class EnvService {
  private readonly env: Env;
  private readonly logger = new Logger(EnvService.name);

  constructor() {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      this.logger.error(
        { errors: result.error.flatten().fieldErrors },
        'Invalid environment variables — application cannot start',
      );
      process.exit(1);
    }
    this.env = result.data;
  }

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }
}
