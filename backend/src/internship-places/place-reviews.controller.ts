import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { CoreHubAccessToken } from '../auth/decorators/core-hub-access-token.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiEnvelope } from '../openapi/api-envelope.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReportDto, SetReviewVisibilityDto } from './dto/moderation.dto';
import { DeletedDto, ReviewViewDto } from './dto/place-responses';
import { UpdateReviewDto } from './dto/update-review.dto';
import { InternshipPlacesService } from './internship-places.service';

/**
 * Reviews of one place. They are listed with the place itself
 * (GET /api/v1/internship-places/:id), so there is no separate list here.
 */
@ApiTags('place-reviews')
@Controller('v1/internship-places/:placeId/reviews')
export class PlaceReviewsController {
  constructor(private readonly places: InternshipPlacesService) {}

  @Post()
  @RequirePermissions(Permission.REVIEW_CREATE)
  @ApiEnvelope(ReviewViewDto, { status: 201 })
  create(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Body() dto: CreateReviewDto,
    @CoreHubAccessToken() token: string,
  ): Promise<ReviewViewDto> {
    return this.places.addReview(user, placeId, dto, token);
  }

  @Patch(':reviewId')
  @RequirePermissions(Permission.REVIEW_UPDATE_OWN)
  @ApiEnvelope(ReviewViewDto)
  update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewViewDto> {
    return this.places.updateReview(user, placeId, reviewId, dto);
  }

  /** Flag someone else's review as inappropriate; moderators settle it. */
  @Post(':reviewId/reports')
  @RequirePermissions(Permission.REVIEW_REPORT)
  @ApiEnvelope(ReviewViewDto, { status: 201 })
  report(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReviewViewDto> {
    return this.places.reportReview(user, placeId, reviewId, dto);
  }

  /** Hide the review or show it again; settles its open reports. */
  @Patch(':reviewId/visibility')
  @RequirePermissions(Permission.REVIEW_MODERATE)
  @ApiEnvelope(ReviewViewDto)
  setVisibility(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: SetReviewVisibilityDto,
  ): Promise<ReviewViewDto> {
    return this.places.setReviewVisibility(user, placeId, reviewId, dto);
  }

  @Delete(':reviewId')
  @RequirePermissions(Permission.REVIEW_DELETE_ANY, Permission.REVIEW_DELETE_OWN)
  @ApiEnvelope(DeletedDto)
  remove(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ): Promise<DeletedDto> {
    return this.places.removeReview(user, placeId, reviewId);
  }
}
