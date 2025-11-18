import { Comentario, ComentarioWithReplies, ComentarioWithUser, ComentarioStats } from '../../entities/comentario.entity';

export type CreateComentarioData = Omit<Comentario, 'id' | 'created_at' | 'updated_at'>;
export type UpdateComentarioData = Partial<CreateComentarioData>;

export type OrderByComentario = 'id' | 'created_at' | 'updated_at' | 'likes';
export type OrderDirection = 'asc' | 'desc';

export interface FindAllComentariosOptions {
  page?: number;
  limit?: number;
  search?: string;
  post_id?: number;
  usuario_id?: number;
  parent_id?: number | null;
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
  is_edited?: boolean;
  orderBy?: OrderByComentario;
  order?: OrderDirection;
  withUser?: boolean;
  withReplies?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ModerateComentarioData {
  status: 'approved' | 'rejected' | 'spam';
  moderated_by: number;
  moderation_notes?: string;
}

export interface IComentariosRepository {
  create(data: CreateComentarioData): Promise<Comentario>;
  findAll(options?: FindAllComentariosOptions): Promise<Paginated<Comentario | ComentarioWithUser>>;
  findOne(id: number, withUser?: boolean): Promise<Comentario | ComentarioWithUser | null>;
  findByPost(postId: number, withReplies?: boolean, withUser?: boolean): Promise<ComentarioWithReplies[]>;
  findReplies(parentId: number): Promise<Comentario[]>;
  update(id: number, data: UpdateComentarioData): Promise<Comentario | null>;
  moderate(id: number, data: ModerateComentarioData): Promise<Comentario | null>;
  remove(id: number): Promise<boolean>;
  getStats(): Promise<ComentarioStats>;
  getTopCommentedPosts(limit?: number): Promise<any[]>;
  getMostActiveUsers(limit?: number): Promise<any[]>;
}
