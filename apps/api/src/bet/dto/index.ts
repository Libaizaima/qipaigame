import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class PlaceBetDto {
  @IsString()
  roomId: string;

  @IsString()
  betType: string;

  @IsNumber()
  @Min(1)
  betAmount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
