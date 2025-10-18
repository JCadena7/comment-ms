import { Type } from 'class-transformer';
import { IsNotEmpty, IsInt, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ModerateComentarioDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @IsEnum(['approved', 'rejected', 'spam'])
  @IsNotEmpty()
  status!: 'approved' | 'rejected' | 'spam';

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  moderated_by!: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  moderation_notes?: string;
}
