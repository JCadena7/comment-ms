import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { Comentario, ComentarioWithUser } from '../../entities/comentario.entity';

@Injectable()
export class FindOneComentarioUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(id: number, withUser = false): Promise<Comentario | ComentarioWithUser> {
    const comentario = await this.repository.findOne(id, withUser);
    if (!comentario) {
      throw new NotFoundException(`Comentario con id ${id} no encontrado`);
    }
    return comentario;
  }
}
