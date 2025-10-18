import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';

@Injectable()
export class RemoveComentarioUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(id: number): Promise<{ success: boolean; message: string }> {
    const deleted = await this.repository.remove(id);
    
    if (!deleted) {
      throw new NotFoundException(`Comentario con id ${id} no encontrado`);
    }

    return {
      success: true,
      message: `Comentario con id ${id} eliminado correctamente`,
    };
  }
}
