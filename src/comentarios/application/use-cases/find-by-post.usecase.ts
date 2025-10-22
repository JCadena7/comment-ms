import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { ComentarioWithReplies } from '../../entities/comentario.entity';

@Injectable()
export class FindByPostUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(postId: number, withReplies = false, withUser = false): Promise<ComentarioWithReplies[]> {
    return this.repository.findByPost(postId, withReplies, withUser);
  }
}
