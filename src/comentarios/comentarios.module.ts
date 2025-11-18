import { Module } from '@nestjs/common';
import { ComentariosController } from './comentarios.controller';
import { PostgresComentariosRepository } from './infrastructure/repositories/postgres-comentarios.repository';
import { COMENTARIOS_REPOSITORY } from './tokens';
import { CreateComentarioUseCase } from './application/use-cases/create-comentario.usecase';
import { FindAllComentariosUseCase } from './application/use-cases/find-all-comentarios.usecase';
import { FindOneComentarioUseCase } from './application/use-cases/find-one-comentario.usecase';
import { FindByPostUseCase } from './application/use-cases/find-by-post.usecase';
import { FindRepliesUseCase } from './application/use-cases/find-replies.usecase';
import { UpdateComentarioUseCase } from './application/use-cases/update-comentario.usecase';
import { ModerateComentarioUseCase } from './application/use-cases/moderate-comentario.usecase';
import { RemoveComentarioUseCase } from './application/use-cases/remove-comentario.usecase';
import { GetComentariosStatsUseCase } from './application/use-cases/get-comentarios-stats.usecase';
import { GetTopCommentedPostsUseCase } from './application/use-cases/get-top-commented-posts.usecase';
import { GetMostActiveUsersUseCase } from './application/use-cases/get-most-active-users.usecase';

@Module({
  controllers: [ComentariosController],
  providers: [
    { provide: COMENTARIOS_REPOSITORY, useClass: PostgresComentariosRepository },
    CreateComentarioUseCase,
    FindAllComentariosUseCase,
    FindOneComentarioUseCase,
    FindByPostUseCase,
    FindRepliesUseCase,
    UpdateComentarioUseCase,
    ModerateComentarioUseCase,
    RemoveComentarioUseCase,
    GetComentariosStatsUseCase,
    GetTopCommentedPostsUseCase,
    GetMostActiveUsersUseCase,
  ],
})
export class ComentariosModule {}
