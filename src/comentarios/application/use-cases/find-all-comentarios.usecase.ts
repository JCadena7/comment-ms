import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository, Paginated } from '../../domain/repositories/comentarios.repository';
import { FindAllComentariosDto } from '../../dto/find-all-comentarios.dto';
import { Comentario, ComentarioWithUser } from '../../entities/comentario.entity';

@Injectable()
export class FindAllComentariosUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(dto: FindAllComentariosDto = {}): Promise<Paginated<Comentario | ComentarioWithUser>> {
    return this.repository.findAll({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      post_id: dto.post_id,
      usuario_id: dto.usuario_id,
      parent_id: dto.parent_id,
      status: dto.status,
      is_edited: dto.is_edited,
      orderBy: dto.orderBy,
      order: dto.order,
      withUser: dto.withUser,
      withReplies: dto.withReplies,
    });
  }
}
