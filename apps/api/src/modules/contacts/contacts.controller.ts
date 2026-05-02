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
  ContactQuerySchema,
  CreateContactSchema,
  CreateTagSchema,
  UpdateContactSchema,
  UpdateTagSchema,
  type ContactQueryDto,
  type CreateContactDto,
  type CreateTagDto,
  type UpdateContactDto,
  type UpdateTagDto,
} from '@wa-kijo/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestContext } from '../../common/context/request-context';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@ApiCookieAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  // ── Contacts ────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'List contacts', description: 'Returns a cursor-paginated list of contacts for the active organisation. Supports full-text search and filtering by tag or blocked status.' })
  @ApiOkResponse({ description: 'Paginated contact list' })
  list(
    @CurrentUser() ctx: RequestContext,
    @Query(new ZodValidationPipe(ContactQuerySchema)) query: ContactQueryDto,
  ) {
    return this.contacts.list(ctx, query);
  }

  @Get(':id')
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'Get contact by ID', description: 'Returns a single contact with its tags. Returns 404 if the contact does not exist within the active organisation.' })
  @ApiOkResponse({ description: 'Contact with tags' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  findOne(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return this.contacts.findOne(ctx, id);
  }

  @Post()
  @RequirePermission('contact:create')
  @ApiOperation({ summary: 'Create contact', description: 'Creates a new contact in the active organisation. Phone must be in E.164 format and unique within the org.' })
  @ApiCreatedResponse({ description: 'Contact created' })
  create(
    @CurrentUser() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateContactSchema)) dto: CreateContactDto,
  ) {
    return this.contacts.create(ctx, dto);
  }

  @Patch(':id')
  @RequirePermission('contact:update')
  @ApiOperation({ summary: 'Update contact', description: 'Partially updates a contact. Supplying tagIds replaces the full tag set.' })
  @ApiOkResponse({ description: 'Updated contact' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContactSchema)) dto: UpdateContactDto,
  ) {
    return this.contacts.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('contact:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contact', description: 'Soft-deletes a contact. The record is retained and can be restored via Prisma Studio or a future admin endpoint.' })
  @ApiNoContentResponse({ description: 'Contact deleted' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    await this.contacts.remove(ctx, id);
  }
}

@ApiTags('Tags')
@ApiCookieAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'List tags', description: 'Returns all tags defined in the active organisation, ordered by name.' })
  @ApiOkResponse({ description: 'Tag list' })
  list(@CurrentUser() ctx: RequestContext) {
    return this.contacts.listTags(ctx);
  }

  @Post()
  @RequirePermission('tag:create')
  @ApiOperation({ summary: 'Create tag', description: 'Creates a new label for categorising contacts. Name must be unique within the org.' })
  @ApiCreatedResponse({ description: 'Tag created' })
  create(
    @CurrentUser() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateTagSchema)) dto: CreateTagDto,
  ) {
    return this.contacts.createTag(ctx, dto);
  }

  @Patch(':id')
  @RequirePermission('tag:update')
  @ApiOperation({ summary: 'Update tag' })
  @ApiOkResponse({ description: 'Updated tag' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTagSchema)) dto: UpdateTagDto,
  ) {
    return this.contacts.updateTag(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('tag:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tag', description: 'Permanently deletes a tag and removes it from all contacts in the organisation.' })
  @ApiNoContentResponse({ description: 'Tag deleted' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    await this.contacts.removeTag(ctx, id);
  }
}
