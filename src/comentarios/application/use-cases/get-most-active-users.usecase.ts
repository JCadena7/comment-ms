import { Inject, Injectable } from '@nestjs/common';
import { COMENTARIOS_REPOSITORY } from '../../tokens';
import { IComentariosRepository } from '../../domain/repositories/comentarios.repository';

@Injectable()
export class GetMostActiveUsersUseCase {
  constructor(
    @Inject(COMENTARIOS_REPOSITORY)
    private readonly repository: IComentariosRepository,
  ) {}

  async execute(limit = 10): Promise<any[]> {
    return this.repository.getMostActiveUsers(limit);
  }
}
