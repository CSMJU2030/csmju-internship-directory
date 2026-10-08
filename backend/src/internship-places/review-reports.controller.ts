import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { ApiEnvelope } from '../openapi/api-envelope.decorator';
import { QueryReportsDto } from './dto/moderation.dto';
import { ReviewReportViewDto } from './dto/place-responses';
import { InternshipPlacesService } from './internship-places.service';

/**
 * The moderators' queue of reported reviews. A report is made on the review
 * (POST .../reviews/:reviewId/reports) and settled by hiding or keeping it
 * (PATCH .../reviews/:reviewId/visibility).
 */
@ApiTags('review-reports')
@Controller('v1/review-reports')
export class ReviewReportsController {
  constructor(private readonly places: InternshipPlacesService) {}

  @Get()
  @RequirePermissions(Permission.REVIEW_MODERATE)
  @ApiEnvelope(ReviewReportViewDto, { collection: true })
  async findAll(
    @CurrentUser() user: CoreHubIdentity,
    @Query() query: QueryReportsDto,
  ): Promise<CollectionResult<ReviewReportViewDto>> {
    const { items, total } = await this.places.listReports(user, query);
    return new CollectionResult(items, buildPaginationMeta(total, query.page ?? 1, query.take));
  }
}
