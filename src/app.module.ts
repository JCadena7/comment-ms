import { Module } from '@nestjs/common';
import { ComentariosModule } from './comentarios/comentarios.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, ComentariosModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
