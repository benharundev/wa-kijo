import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  ConversationQuerySchema,
  CreateConversationSchema,
  MessageQuerySchema,
  SendMessageSchema,
  UpdateConversationSchema,
  type ConversationQueryDto,
  type CreateConversationDto,
  type MessageQueryDto,
  type SendMessageDto,
  type UpdateConversationDto,
} from '@wa-kijo/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestContext } from '../../common/context/request-context';
import { ConversationsService } from './conversations.service';

@ApiTags('Conversations')
@ApiCookieAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  // ── Conversations ────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('conversation:read')
  @ApiOperation({
    summary: 'List conversations',
    description:
      'Returns a cursor-paginated inbox, ordered by most recent message. Supports filtering by status, contact, assigned agent, and channel.',
  })
  @ApiOkResponse({ description: 'Paginated conversation list' })
  list(
    @CurrentUser() ctx: RequestContext,
    @Query(new ZodValidationPipe(ConversationQuerySchema)) query: ConversationQueryDto,
  ) {
    return this.conversations.list(ctx, query);
  }

  @Get(':id')
  @RequirePermission('conversation:read')
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Returns a single conversation with its contact summary.',
  })
  @ApiOkResponse({ description: 'Conversation with contact' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  findOne(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return this.conversations.findOne(ctx, id);
  }

  @Post()
  @RequirePermission('conversation:create')
  @ApiOperation({
    summary: 'Open conversation',
    description:
      'Opens a new conversation with a contact on the specified channel. Returns 409 if an open conversation already exists for that contact + channel combination.',
  })
  @ApiCreatedResponse({ description: 'Conversation opened' })
  create(
    @CurrentUser() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateConversationSchema)) dto: CreateConversationDto,
  ) {
    return this.conversations.create(ctx, dto);
  }

  @Patch(':id')
  @RequirePermission('conversation:read')
  @ApiOperation({
    summary: 'Update conversation',
    description:
      'Update status (open | closed | snoozed) or assigned agent. Requires conversation:assign permission to change assignedToUserId.',
  })
  @ApiOkResponse({ description: 'Updated conversation' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateConversationSchema)) dto: UpdateConversationDto,
  ) {
    return this.conversations.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('conversation:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Soft-deletes a conversation and all its messages.',
  })
  @ApiNoContentResponse({ description: 'Conversation deleted' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    await this.conversations.remove(ctx, id);
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  @Get(':id/messages')
  @RequirePermission('message:read')
  @ApiOperation({
    summary: 'List messages',
    description:
      'Returns cursor-paginated messages within a conversation, newest first. Filter by direction (inbound | outbound).',
  })
  @ApiOkResponse({ description: 'Paginated message list' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  listMessages(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(MessageQuerySchema)) query: MessageQueryDto,
  ) {
    return this.conversations.listMessages(ctx, id, query);
  }

  @Post(':id/messages')
  @RequirePermission('message:send')
  @ApiOperation({
    summary: 'Send message',
    description:
      'Queues an outbound message for delivery. The message is persisted with status=queued; a background job dispatches it to the provider and updates the status via webhook.',
  })
  @ApiCreatedResponse({ description: 'Message queued for delivery' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  sendMessage(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(ctx, id, dto);
  }
}
