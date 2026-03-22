import { IsArray, ValidateNested, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SoloBetItem {
  @IsString()
  betType: string;

  @IsNumber()
  @Min(1)
  betAmount: number;
}

export class SoloPlayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoloBetItem)
  bets: SoloBetItem[];
}
