export interface Comentario {
  id: number;
  contenido: string;
  post_id: number;
  usuario_id: number;
  parent_id: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  likes: number;
  is_edited: boolean;
  edited_at: Date | null;
  moderated_by: number | null;
  moderated_at: Date | null;
  moderation_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ComentarioWithReplies extends Comentario {
  replies?: ComentarioWithReplies[];
  replies_count?: number;
}

export interface ComentarioWithUser extends Comentario {
  usuario?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
}

export interface ComentarioStats {
  total_comentarios: number;
  comentarios_aprobados: number;
  comentarios_pendientes: number;
  comentarios_rechazados: number;
  comentarios_spam: number;
  promedio_likes: number;
  comentarios_editados: number;
}
