import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { UpdateComentarioDto } from '../../dto/update-comentario.dto';
import { Comentario } from '../../entities/comentario.entity';

@Injectable()
export class UpdateComentarioUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(dto: UpdateComentarioDto): Promise<Comentario> {
    const { id, ...data } = dto;
    
    const updated = await this.repository.update(id, {
      contenido: data.contenido,
      post_id: data.post_id,
      usuario_id: data.usuario_id,
      parent_id: data.parent_id,
      status: data.status,
      likes: data.likes,
      is_edited: data.is_edited,
      edited_at: data.edited_at ? new Date(data.edited_at) : undefined,
      moderated_by: data.moderated_by,
      moderated_at: data.moderated_at ? new Date(data.moderated_at) : undefined,
      moderation_notes: data.moderation_notes,
    });

    if (!updated) {
      throw new NotFoundException(`Comentario con id ${id} no encontrado`);
    }

    return updated;
  }
}
