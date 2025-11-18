import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';
import { CreateComentarioDto } from '../../dto/create-comentario.dto';
import { Comentario } from '../../entities/comentario.entity';

@Injectable()
export class CreateComentarioUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(dto: CreateComentarioDto): Promise<Comentario> {
    return this.repository.create({
      contenido: dto.contenido,
      post_id: dto.post_id,
      usuario_id: dto.usuario_id,
      parent_id: dto.parent_id ?? null,
      status: dto.status ?? 'pending',
      likes: dto.likes ?? 0,
      is_edited: dto.is_edited ?? false,
      edited_at: dto.edited_at ? new Date(dto.edited_at) : null,
      moderated_by: dto.moderated_by ?? null,
      moderated_at: dto.moderated_at ? new Date(dto.moderated_at) : null,
      moderation_notes: dto.moderation_notes ?? null,
    });
  }
}
