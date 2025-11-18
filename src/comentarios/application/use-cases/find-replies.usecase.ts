import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { Comentario } from '../../entities/comentario.entity';

@Injectable()
export class FindRepliesUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(parentId: number): Promise<Comentario[]> {
    return this.repository.findReplies(parentId);
  }
}
