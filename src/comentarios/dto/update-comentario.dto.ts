import { PartialType } from '@nestjs/mapped-types';
import { CreateComentarioDto } from './create-comentario.dto';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateComentarioDto extends PartialType(CreateComentarioDto) {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  id!: number;
}
