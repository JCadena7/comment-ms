import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { ComentarioStats } from '../../entities/comentario.entity';

@Injectable()
export class GetComentariosStatsUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(): Promise<ComentarioStats> {
    return this.repository.getStats();
  }
}
