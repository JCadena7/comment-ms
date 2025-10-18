import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { ModerateComentarioDto } from '../../dto/moderate-comentario.dto';
import { Comentario } from '../../entities/comentario.entity';

@Injectable()
export class ModerateComentarioUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(dto: ModerateComentarioDto): Promise<Comentario> {
    const { id, ...data } = dto;
    
    const moderated = await this.repository.moderate(id, {
      status: data.status,
      moderated_by: data.moderated_by,
      moderation_notes: data.moderation_notes,
    });

    if (!moderated) {
      throw new NotFoundException(`Comentario con id ${id} no encontrado`);
    }

    return moderated;
  }
}
