import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lastName?: string;
}
