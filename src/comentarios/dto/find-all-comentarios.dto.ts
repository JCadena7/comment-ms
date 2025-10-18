import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsEnum, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindAllComentariosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  post_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuario_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number | null;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'spam'])
  status?: 'pending' | 'approved' | 'rejected' | 'spam';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_edited?: boolean;

  @IsOptional()
  @IsEnum(['id', 'created_at', 'updated_at', 'likes'])
  orderBy?: 'id' | 'created_at' | 'updated_at' | 'likes';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  withUser?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  withReplies?: boolean;
}
