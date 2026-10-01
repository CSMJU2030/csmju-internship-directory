import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { QueryPlacesDto } from './dto/query-places.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { InternshipPlacesService } from './internship-places.service';
import { PLACE_TAGS } from './tags';

@Controller('v1/internship-places')
export class InternshipPlacesController {
  constructor(private readonly places: InternshipPlacesService) {}

  @Get()
  @RequirePermissions(Permission.PLACE_READ)
  async findAll(@Query() query: QueryPlacesDto) {
    const { items, total } = await this.places.findAll(query);
    return new CollectionResult(items, buildPaginationMeta(total, query.page ?? 1, query.take));
  }

  /** The closed list of fields of work - declared before :id so it is not read as an id. */
  @Get('tags')
  @RequirePermissions(Permission.PLACE_READ)
  tags() {
    return new CollectionResult([...PLACE_TAGS], { total: PLACE_TAGS.length });
  }

  @Get(':id')
  @RequirePermissions(Permission.PLACE_READ)
  findOne(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string) {
    return this.places.findOne(user, id);
  }

  @Post()
  @RequirePermissions(Permission.PLACE_CREATE)
  create(@CurrentUser() user: CoreHubIdentity, @Body() dto: CreatePlaceDto) {
    return this.places.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PLACE_UPDATE_ANY)
  update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaceDto,
  ) {
    return this.places.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PLACE_DELETE_ANY)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.places.remove(id);
  }
}
