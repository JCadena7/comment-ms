import { Type, Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class CreateComentarioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contenido!: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  post_id!: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  usuario_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number | null;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'spam'])
  status?: 'pending' | 'approved' | 'rejected' | 'spam';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  likes?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_edited?: boolean;

  @IsOptional()
  @IsDateString()
  edited_at?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moderated_by?: number | null;

  @IsOptional()
  @IsDateString()
  moderated_at?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  moderation_notes?: string | null;
}
