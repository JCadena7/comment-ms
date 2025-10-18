import { Injectable, OnModuleInit } from '@nestjs/common';
import { db } from '../../../database/pg';
import {
  IComentariosRepository,
  CreateComentarioData,
  UpdateComentarioData,
  FindAllComentariosOptions,
  Paginated,
  ModerateComentarioData,
} from '../../domain/repositories/comentarios.repository';
import { Comentario, ComentarioWithReplies, ComentarioWithUser, ComentarioStats } from '../../entities/comentario.entity';

@Injectable()
export class PostgresComentariosRepository implements IComentariosRepository, OnModuleInit {
  
    // en produccion se desactiva
  async onModuleInit() {
    await this.initializeViewsAndTriggers();
  }

  /**
   * Inicializa vistas y triggers para el módulo de comentarios
   */
  private async initializeViewsAndTriggers() {
    const client = await db.pool.connect();
    try {
      // ========== LIMPIAR TRIGGERS Y FUNCIONES ANTIGUAS ==========
      await client.query(`
        -- Eliminar triggers antiguos
        DROP TRIGGER IF EXISTS trigger_notify_new_comment ON comentarios;
        DROP TRIGGER IF EXISTS trigger_notify_post_author_on_comment ON comentarios;
        DROP TRIGGER IF EXISTS trigger_notify_parent_comment_author_on_reply ON comentarios;
        DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON comentarios;
        DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
        DROP TRIGGER IF EXISTS trigger_mark_comment_as_edited ON comentarios;
        DROP TRIGGER IF EXISTS trigger_update_comment_moderation ON comentarios;
        
        -- Eliminar funciones antiguas (todas las posibles variantes)
        DROP FUNCTION IF EXISTS notify_new_comment();
        DROP FUNCTION IF EXISTS notify_post_author_on_comment();
        DROP FUNCTION IF EXISTS notify_parent_comment_author_on_reply();
        DROP FUNCTION IF EXISTS notify_comment_reply();
        DROP FUNCTION IF EXISTS update_comment_likes_count();
        DROP FUNCTION IF EXISTS mark_comment_as_edited();
        DROP FUNCTION IF EXISTS update_comment_moderation();
      `);

      // ========== VISTAS ==========
      
      // Vista: Comentarios con información del usuario
      await client.query(`
        CREATE OR REPLACE VIEW v_comentarios_con_usuario AS
        SELECT 
          c.*,
          json_build_object(
            'id', u.id,
            'username', u.username,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar', u.avatar
          ) as usuario
        FROM comentarios c
        LEFT JOIN usuarios u ON c.usuario_id = u.id;
      `);

      // Vista: Estadísticas de comentarios por post
      await client.query(`
        CREATE OR REPLACE VIEW v_comentarios_stats_por_post AS
        SELECT 
          post_id,
          COUNT(*) as total_comentarios,
          COUNT(*) FILTER (WHERE status = 'approved') as comentarios_aprobados,
          COUNT(*) FILTER (WHERE status = 'pending') as comentarios_pendientes,
          COUNT(*) FILTER (WHERE status = 'rejected') as comentarios_rechazados,
          COUNT(*) FILTER (WHERE status = 'spam') as comentarios_spam,
          AVG(likes)::DECIMAL(10,2) as promedio_likes,
          MAX(created_at) as ultimo_comentario,
          COUNT(*) FILTER (WHERE parent_id IS NULL) as comentarios_principales,
          COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as respuestas
        FROM comentarios
        GROUP BY post_id;
      `);

      // Vista: Usuarios más activos en comentarios
      await client.query(`
        CREATE OR REPLACE VIEW v_usuarios_mas_activos_comentarios AS
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar,
          COUNT(c.id) as total_comentarios,
          COUNT(c.id) FILTER (WHERE c.status = 'approved') as comentarios_aprobados,
          SUM(c.likes) as total_likes_recibidos,
          AVG(c.likes)::DECIMAL(10,2) as promedio_likes,
          MAX(c.created_at) as ultimo_comentario
        FROM usuarios u
        LEFT JOIN comentarios c ON u.id = c.usuario_id
        GROUP BY u.id, u.username, u.first_name, u.last_name, u.avatar
        HAVING COUNT(c.id) > 0
        ORDER BY total_comentarios DESC;
      `);

      // Vista: Posts más comentados
      await client.query(`
        CREATE OR REPLACE VIEW v_posts_mas_comentados AS
        SELECT 
          p.id,
          p.titulo,
          p.slug,
          p.usuario_id,
          COUNT(c.id) as total_comentarios,
          COUNT(c.id) FILTER (WHERE c.status = 'approved') as comentarios_aprobados,
          AVG(c.likes)::DECIMAL(10,2) as promedio_likes_comentarios,
          MAX(c.created_at) as ultimo_comentario
        FROM posts p
        LEFT JOIN comentarios c ON p.id = c.post_id
        GROUP BY p.id, p.titulo, p.slug, p.usuario_id
        HAVING COUNT(c.id) > 0
        ORDER BY total_comentarios DESC;
      `);

      // Vista: Comentarios con respuestas (jerarquía)
      await client.query(`
        CREATE OR REPLACE VIEW v_comentarios_con_respuestas AS
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM comentarios WHERE parent_id = c.id) as replies_count,
          json_build_object(
            'id', u.id,
            'username', u.username,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar', u.avatar
          ) as usuario
        FROM comentarios c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.parent_id IS NULL;
      `);

      // ========== TRIGGERS ==========

      // Trigger: Actualizar contador de likes en comentarios
      await client.query(`
        CREATE OR REPLACE FUNCTION update_comment_likes_count()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            UPDATE comentarios SET likes = likes + 1 WHERE id = NEW.comment_id;
          ELSIF TG_OP = 'DELETE' THEN
            UPDATE comentarios SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
        CREATE TRIGGER trigger_update_comment_likes_count
        AFTER INSERT OR DELETE ON comment_likes
        FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();
      `);

      // Trigger: Marcar comentario como editado
      await client.query(`
        CREATE OR REPLACE FUNCTION mark_comment_as_edited()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.contenido IS DISTINCT FROM NEW.contenido THEN
            NEW.is_edited = TRUE;
            NEW.edited_at = CURRENT_TIMESTAMP;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_mark_comment_as_edited ON comentarios;
        CREATE TRIGGER trigger_mark_comment_as_edited
        BEFORE UPDATE ON comentarios
        FOR EACH ROW EXECUTE FUNCTION mark_comment_as_edited();
      `);

      // Trigger: Actualizar moderation timestamp
      await client.query(`
        CREATE OR REPLACE FUNCTION update_comment_moderation()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected', 'spam') THEN
            NEW.moderated_at = CURRENT_TIMESTAMP;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_comment_moderation ON comentarios;
        CREATE TRIGGER trigger_update_comment_moderation
        BEFORE UPDATE ON comentarios
        FOR EACH ROW EXECUTE FUNCTION update_comment_moderation();
      `);

      // Trigger: Notificar nuevo comentario (notify_new_comment)
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_new_comment()
        RETURNS TRIGGER AS $$
        DECLARE
          post_author_id INTEGER;
          commenter_name TEXT;
        BEGIN
          -- Obtener el autor del post
          SELECT usuario_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
          
          -- Obtener el nombre del comentarista
          SELECT CONCAT(first_name, ' ', last_name) INTO commenter_name 
          FROM usuarios WHERE id = NEW.usuario_id;
          
          -- Solo notificar si el comentarista no es el autor del post
          IF post_author_id IS NOT NULL AND post_author_id != NEW.usuario_id THEN
            INSERT INTO notifications (user_id, type, title, message, action_url)
            VALUES (
              post_author_id,
              'info',
              'Nuevo comentario',
              commenter_name || ' ha comentado en tu publicación',
              '/posts/' || NEW.post_id
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_notify_new_comment
        AFTER INSERT ON comentarios
        FOR EACH ROW EXECUTE FUNCTION notify_new_comment();
      `);

      // Trigger: Notificar al autor del comentario padre cuando hay una respuesta
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_parent_comment_author_on_reply()
        RETURNS TRIGGER AS $$
        DECLARE
          parent_author_id INTEGER;
          replier_name TEXT;
        BEGIN
          IF NEW.parent_id IS NOT NULL THEN
            -- Obtener el autor del comentario padre
            SELECT usuario_id INTO parent_author_id FROM comentarios WHERE id = NEW.parent_id;
            
            -- Obtener el nombre del que responde
            SELECT CONCAT(first_name, ' ', last_name) INTO replier_name 
            FROM usuarios WHERE id = NEW.usuario_id;
            
            -- Solo notificar si el que responde no es el autor del comentario padre
            IF parent_author_id IS NOT NULL AND parent_author_id != NEW.usuario_id THEN
              INSERT INTO notifications (user_id, type, title, message, action_url)
              VALUES (
                parent_author_id,
                'info',
                'Nueva respuesta',
                replier_name || ' ha respondido a tu comentario',
                '/posts/' || NEW.post_id || '#comment-' || NEW.id
              );
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_notify_parent_comment_author_on_reply
        AFTER INSERT ON comentarios
        FOR EACH ROW EXECUTE FUNCTION notify_parent_comment_author_on_reply();
      `);

      // Trigger: Notificar al autor del post (notify_post_author_on_comment)
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_post_author_on_comment()
        RETURNS TRIGGER AS $$
        DECLARE
          post_author_id INTEGER;
          post_title TEXT;
          commenter_name TEXT;
        BEGIN
          -- Solo procesar si es un comentario principal (no una respuesta)
          IF NEW.parent_id IS NULL THEN
            -- Obtener el autor y título del post
            SELECT p.usuario_id, p.titulo 
            INTO post_author_id, post_title 
            FROM posts p 
            WHERE p.id = NEW.post_id;
            
            -- Obtener el nombre del comentarista
            SELECT CONCAT(first_name, ' ', last_name) INTO commenter_name 
            FROM usuarios WHERE id = NEW.usuario_id;
            
            -- Solo notificar si el comentarista no es el autor del post
            IF post_author_id IS NOT NULL AND post_author_id != NEW.usuario_id THEN
              INSERT INTO notifications (user_id, type, title, message, action_url)
              VALUES (
                post_author_id,
                'info',
                'Comentario en tu publicación',
                commenter_name || ' comentó: "' || LEFT(NEW.contenido, 50) || '..."',
                '/posts/' || NEW.post_id || '#comment-' || NEW.id
              );
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_notify_post_author_on_comment
        AFTER INSERT ON comentarios
        FOR EACH ROW EXECUTE FUNCTION notify_post_author_on_comment();
      `);

      // Trigger: Notificar respuesta a comentario (notify_comment_reply)
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_comment_reply()
        RETURNS TRIGGER AS $$
        DECLARE
          parent_author_id INTEGER;
          parent_content TEXT;
          replier_name TEXT;
        BEGIN
          -- Solo procesar si es una respuesta (tiene parent_id)
          IF NEW.parent_id IS NOT NULL THEN
            -- Obtener el autor del comentario padre
            SELECT c.usuario_id, c.contenido 
            INTO parent_author_id, parent_content 
            FROM comentarios c 
            WHERE c.id = NEW.parent_id;
            
            -- Obtener el nombre del que responde
            SELECT CONCAT(first_name, ' ', last_name) INTO replier_name 
            FROM usuarios WHERE id = NEW.usuario_id;
            
            -- Solo notificar si el que responde no es el autor del comentario padre
            IF parent_author_id IS NOT NULL AND parent_author_id != NEW.usuario_id THEN
              INSERT INTO notifications (user_id, type, title, message, action_url)
              VALUES (
                parent_author_id,
                'info',
                'Respuesta a tu comentario',
                replier_name || ' respondió: "' || LEFT(NEW.contenido, 50) || '..."',
                '/posts/' || NEW.post_id || '#comment-' || NEW.id
              );
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_notify_comment_reply
        AFTER INSERT ON comentarios
        FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();
      `);

      console.log('✅ Vistas y triggers de comentarios inicializados correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar vistas y triggers de comentarios:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async create(data: CreateComentarioData): Promise<Comentario> {
    const result = await db.pool.query(
      `INSERT INTO comentarios (
        contenido, post_id, usuario_id, parent_id, status, likes,
        is_edited, edited_at, moderated_by, moderated_at, moderation_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.contenido,
        data.post_id,
        data.usuario_id,
        data.parent_id ?? null,
        data.status ?? 'pending',
        data.likes ?? 0,
        data.is_edited ?? false,
        data.edited_at ?? null,
        data.moderated_by ?? null,
        data.moderated_at ?? null,
        data.moderation_notes ?? null,
      ]
    );
    return result.rows[0];
  }

  async findAll(options: FindAllComentariosOptions = {}): Promise<Paginated<Comentario | ComentarioWithUser>> {
    const {
      page = 1,
      limit = 10,
      search,
      post_id,
      usuario_id,
      parent_id,
      status,
      is_edited,
      orderBy = 'created_at',
      order = 'desc',
      withUser = false,
      withReplies = false,
    } = options;

    // Si se solicitan réplicas y hay un post_id específico, usar estructura jerárquica
    if (withReplies && post_id !== undefined) {
      const hierarchicalComments = await this.findByPost(post_id, true);
      
      // Aplicar filtros adicionales si existen
      let filteredComments = hierarchicalComments;
      
      if (status) {
        filteredComments = this.filterCommentsByStatus(filteredComments, status);
      }
      
      if (usuario_id !== undefined) {
        filteredComments = this.filterCommentsByUser(filteredComments, usuario_id);
      }
      
      if (search) {
        filteredComments = this.filterCommentsBySearch(filteredComments, search);
      }

      const total = this.countTotalComments(filteredComments);
      const offset = (page - 1) * limit;
      const paginatedComments = filteredComments.slice(offset, offset + limit);

      return {
        items: paginatedComments as any,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    }

    // Flujo normal sin réplicas jerárquicas
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`c.contenido ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (post_id !== undefined) {
      conditions.push(`c.post_id = $${paramIndex}`);
      params.push(post_id);
      paramIndex++;
    }

    if (usuario_id !== undefined) {
      conditions.push(`c.usuario_id = $${paramIndex}`);
      params.push(usuario_id);
      paramIndex++;
    }

    if (parent_id !== undefined) {
      if (parent_id === null) {
        conditions.push(`c.parent_id IS NULL`);
      } else {
        conditions.push(`c.parent_id = $${paramIndex}`);
        params.push(parent_id);
        paramIndex++;
      }
    }

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (is_edited !== undefined) {
      conditions.push(`c.is_edited = $${paramIndex}`);
      params.push(is_edited);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Usar vista si se requiere información del usuario
    const fromClause = withUser ? 'v_comentarios_con_usuario c' : 'comentarios c';

    // Contar total
    const countResult = await db.pool.query(
      `SELECT COUNT(*) as total FROM ${fromClause} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Obtener items
    const result = await db.pool.query(
      `SELECT * FROM ${fromClause}
       ${whereClause}
       ORDER BY c.${orderBy} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      items: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Métodos auxiliares para filtrar comentarios jerárquicos
  private filterCommentsByStatus(comments: any[], status: string): any[] {
    return comments.filter(comment => {
      const matchesStatus = comment.status === status;
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = this.filterCommentsByStatus(comment.replies, status);
      }
      return matchesStatus || (comment.replies && comment.replies.length > 0);
    });
  }

  private filterCommentsByUser(comments: any[], userId: number): any[] {
    return comments.filter(comment => {
      const matchesUser = comment.usuario_id === userId;
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = this.filterCommentsByUser(comment.replies, userId);
      }
      return matchesUser || (comment.replies && comment.replies.length > 0);
    });
  }

  private filterCommentsBySearch(comments: any[], search: string): any[] {
    const searchLower = search.toLowerCase();
    return comments.filter(comment => {
      const matchesSearch = comment.contenido.toLowerCase().includes(searchLower);
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = this.filterCommentsBySearch(comment.replies, search);
      }
      return matchesSearch || (comment.replies && comment.replies.length > 0);
    });
  }

  private countTotalComments(comments: any[]): number {
    let count = 0;
    comments.forEach(comment => {
      count++;
      if (comment.replies && comment.replies.length > 0) {
        count += this.countTotalComments(comment.replies);
      }
    });
    return count;
  }

  async findOne(id: number, withUser = false): Promise<Comentario | ComentarioWithUser | null> {
    const fromClause = withUser ? 'v_comentarios_con_usuario' : 'comentarios';
    const result = await db.pool.query(
      `SELECT * FROM ${fromClause} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByPost(postId: number, withReplies = false): Promise<ComentarioWithReplies[]> {
    if (withReplies) {
      // Obtener comentarios principales con sus respuestas
      const result = await db.pool.query(
        `WITH RECURSIVE comment_tree AS (
          -- Comentarios principales
          SELECT c.*, 0 as depth, ARRAY[c.id] as path
          FROM comentarios c
          WHERE c.post_id = $1 AND c.parent_id IS NULL
          
          UNION ALL
          
          -- Respuestas recursivas
          SELECT c.*, ct.depth + 1, ct.path || c.id
          FROM comentarios c
          INNER JOIN comment_tree ct ON c.parent_id = ct.id
          WHERE c.post_id = $1
        )
        SELECT * FROM comment_tree
        ORDER BY path`,
        [postId]
      );

      // Organizar en estructura jerárquica
      const commentsMap = new Map<number, ComentarioWithReplies>();
      const rootComments: ComentarioWithReplies[] = [];

      result.rows.forEach((row: any) => {
        const comment: ComentarioWithReplies = { ...row, replies: [] };
        commentsMap.set(row.id, comment);

        if (row.parent_id === null) {
          rootComments.push(comment);
        } else {
          const parent = commentsMap.get(row.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        }
      });

      return rootComments;
    } else {
      // Solo comentarios principales
      const result = await db.pool.query(
        `SELECT * FROM comentarios 
         WHERE post_id = $1 AND parent_id IS NULL
         ORDER BY created_at DESC`,
        [postId]
      );
      return result.rows;
    }
  }

  async findReplies(parentId: number): Promise<Comentario[]> {
    const result = await db.pool.query(
      `SELECT * FROM comentarios 
       WHERE parent_id = $1
       ORDER BY created_at ASC`,
      [parentId]
    );
    return result.rows;
  }

  async update(id: number, data: UpdateComentarioData): Promise<Comentario | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findOne(id) as Promise<Comentario>;
    }

    values.push(id);
    const result = await db.pool.query(
      `UPDATE comentarios SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async moderate(id: number, data: ModerateComentarioData): Promise<Comentario | null> {
    const result = await db.pool.query(
      `UPDATE comentarios 
       SET status = $1, moderated_by = $2, moderation_notes = $3, moderated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [data.status, data.moderated_by, data.moderation_notes ?? null, id]
    );
    return result.rows[0] || null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await db.pool.query(
      `DELETE FROM comentarios WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getStats(): Promise<ComentarioStats> {
    const result = await db.pool.query(`
      SELECT 
        COUNT(*) as total_comentarios,
        COUNT(*) FILTER (WHERE status = 'approved') as comentarios_aprobados,
        COUNT(*) FILTER (WHERE status = 'pending') as comentarios_pendientes,
        COUNT(*) FILTER (WHERE status = 'rejected') as comentarios_rechazados,
        COUNT(*) FILTER (WHERE status = 'spam') as comentarios_spam,
        AVG(likes)::DECIMAL(10,2) as promedio_likes,
        COUNT(*) FILTER (WHERE is_edited = true) as comentarios_editados
      FROM comentarios
    `);
    return result.rows[0];
  }

  async getTopCommentedPosts(limit = 10): Promise<any[]> {
    const result = await db.pool.query(
      `SELECT * FROM v_posts_mas_comentados LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getMostActiveUsers(limit = 10): Promise<any[]> {
    const result = await db.pool.query(
      `SELECT * FROM v_usuarios_mas_activos_comentarios LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}
