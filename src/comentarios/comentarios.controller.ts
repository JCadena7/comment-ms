import { Controller, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { UpdateComentarioDto } from './dto/update-comentario.dto';
import { FindAllComentariosDto } from './dto/find-all-comentarios.dto';
import { ModerateComentarioDto } from './dto/moderate-comentario.dto';
import { CreateComentarioUseCase } from './application/use-cases/create-comentario.usecase';
import { FindAllComentariosUseCase } from './application/use-cases/find-all-comentarios.usecase';
import { FindOneComentarioUseCase } from './application/use-cases/find-one-comentario.usecase';
import { FindByPostUseCase } from './application/use-cases/find-by-post.usecase';
import { FindRepliesUseCase } from './application/use-cases/find-replies.usecase';
import { UpdateComentarioUseCase } from './application/use-cases/update-comentario.usecase';
import { ModerateComentarioUseCase } from './application/use-cases/moderate-comentario.usecase';
import { RemoveComentarioUseCase } from './application/use-cases/remove-comentario.usecase';
import { GetComentariosStatsUseCase } from './application/use-cases/get-comentarios-stats.usecase';
import { GetTopCommentedPostsUseCase } from './application/use-cases/get-top-commented-posts.usecase';
import { GetMostActiveUsersUseCase } from './application/use-cases/get-most-active-users.usecase';

@Controller()
export class ComentariosController {
  constructor(
    private readonly createComentario: CreateComentarioUseCase,
    private readonly findAllComentarios: FindAllComentariosUseCase,
    private readonly findOneComentario: FindOneComentarioUseCase,
    private readonly findByPostUseCase: FindByPostUseCase,
    private readonly findRepliesUseCase: FindRepliesUseCase,
    private readonly updateComentario: UpdateComentarioUseCase,
    private readonly moderateComentario: ModerateComentarioUseCase,
    private readonly removeComentario: RemoveComentarioUseCase,
    private readonly getComentariosStats: GetComentariosStatsUseCase,
    private readonly getTopCommentedPosts: GetTopCommentedPostsUseCase,
    private readonly getMostActiveUsers: GetMostActiveUsersUseCase,
  ) {}

  @MessagePattern('createComentario')
  create(@Payload() createComentarioDto: CreateComentarioDto) {
    return this.createComentario.execute(createComentarioDto);
  }

  @MessagePattern('findAllComentarios')
  async findAll(@Payload() dto: FindAllComentariosDto) {
    return this.findAllComentarios.execute(dto);
  }

  @MessagePattern('findOneComentario')
  findOne(@Payload() payload: any) {
    const id = typeof payload === 'number' ? payload : Number(payload?.id);
    const withUser = !!(typeof payload === 'object' && payload?.withUser);
    return this.findOneComentario.execute(id, withUser);
  }

  @MessagePattern('findComentariosByPost')
  findByPost(@Payload() payload: any) {
    const postId = typeof payload === 'number' ? payload : Number(payload?.postId || payload?.post_id);
    const withReplies = !!(typeof payload === 'object' && payload?.withReplies);
    return this.findByPostUseCase.execute(postId, withReplies);
  }

  @MessagePattern('findComentarioReplies')
  findReplies(@Payload() payload: any) {
    const parentId = typeof payload === 'number' ? payload : Number(payload?.parentId || payload?.parent_id);
    return this.findRepliesUseCase.execute(parentId);
  }

  @MessagePattern('updateComentario')
  update(@Payload() updateComentarioDto: UpdateComentarioDto) {
    return this.updateComentario.execute(updateComentarioDto);
  }

  @MessagePattern('moderateComentario')
  moderate(@Payload() moderateComentarioDto: ModerateComentarioDto) {
    return this.moderateComentario.execute(moderateComentarioDto);
  }

  @MessagePattern('removeComentario')
  remove(@Payload('id', ParseIntPipe) id: number) {
    return this.removeComentario.execute(id);
  }

  @MessagePattern('getComentariosStats')
  getStats() {
    return this.getComentariosStats.execute();
  }

  @MessagePattern('getTopCommentedPosts')
  getTopCommented(@Payload() payload: any) {
    const limit = typeof payload === 'number' ? payload : Number(payload?.limit || 10);
    return this.getTopCommentedPosts.execute(limit);
  }

  @MessagePattern('getMostActiveCommenters')
  getMostActive(@Payload() payload: any) {
    const limit = typeof payload === 'number' ? payload : Number(payload?.limit || 10);
    return this.getMostActiveUsers.execute(limit);
  }
}
