import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UsersService } from '../services/users.service';
import { UserDto } from '../dtos/user.dto';
import { ServiceAuthGuard } from '../../../guards/service-auth.guard';


/**
 * Internal user-lookup API — called by other services (notification, etc.)
 * over the compose network. Gated by an EC-signed service JWT (Bearer) so only
 * services holding the internal EC private key can call it. Not exposed through
 * Traefik (the wallet router doesn't match /internal/**).
 */
@ApiTags('Internal')
@Controller('internal/users')
@UseGuards(ServiceAuthGuard)
export class UsersInternalController {
    constructor(private readonly usersService: UsersService) {}

    @Get(':id')
    @ApiOperation({ summary: 'Look up a user by id (internal, EC-JWT gated)' })
    @ApiResponse({ status: 200, type: UserDto })
    @ApiResponse({ status: 401, description: 'Missing or invalid service JWT' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async lookup(@Param('id') id: string): Promise<UserDto> {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`user not found: ${id}`);
        }
        return user.toDto();
    }
}
