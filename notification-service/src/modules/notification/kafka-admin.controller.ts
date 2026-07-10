import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

import { KafkaConsumerService, TopicOffsets } from './kafka-consumer.service';

// ── DTOs ─────────────────────────────────────────────────────────────────

class SeekEntry {
    @ApiProperty({ example: 'user-events' })
    @IsString()
    topic!: string;

    @ApiProperty({ example: 0 })
    partition!: number;

    @ApiProperty({
        description: 'Offset to seek to, or "earliest" to replay from the start',
        example: '0',
    })
    @IsString()
    offset!: string;
}

class SeekDto {
    @ApiProperty({
        description: 'List of { topic, partition, offset } to seek',
        type: [SeekEntry],
    })
    @IsArray()
    @ArrayMinSize(1)
    entries!: SeekEntry[];
}

// ── Controller ───────────────────────────────────────────────────────────

@Controller('internal/kafka')
@ApiTags('internal')
export class KafkaAdminController {
    constructor(private readonly consumer: KafkaConsumerService) {}

    @Get('topics')
    @ApiOperation({ summary: 'List all broker topics (excluding __internal)' })
    @ApiResponse({ status: 200, description: 'Topic names' })
    async listTopics(): Promise<string[]> {
        return this.consumer.listTopics();
    }

    @Get('topics/:topic/offsets')
    @ApiOperation({
        summary: 'Get watermark + consumer-group offsets for a topic',
    })
    @ApiResponse({
        status: 200,
        description: 'Per-partition offset details with lag',
    })
    async getOffsets(@Param('topic') topic: string): Promise<TopicOffsets> {
        return this.consumer.getTopicOffsets(topic);
    }

    @Post('seek')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Rewind the consumer to specific offsets (replay events)',
        description:
            'Pauses the consumer, seeks to the given offsets, and resumes. ' +
            'Use offset "earliest" to replay all messages from the beginning. ' +
            'Only works for topics this consumer is subscribed to.',
    })
    @ApiResponse({ status: 200, description: 'Seek applied' })
    @ApiResponse({ status: 400, description: 'Topic not subscribed' })
    async seek(@Body() dto: SeekDto) {
        return this.consumer.seek(dto.entries);
    }
}
