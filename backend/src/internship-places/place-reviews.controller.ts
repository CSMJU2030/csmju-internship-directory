import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { CoreHubAccessToken } from '../auth/decorators/core-hub-access-token.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { InternshipPlacesService } from './internship-places.service';

/**
 * Reviews of one place. They are listed with the place itself
 * (GET /api/v1/internship-places/:id), so there is no separate list here.
 */
@Controller('v1/internship-places/:placeId/reviews')
export class PlaceReviewsController {
  constructor(private readonly places: InternshipPlacesService) {}

  @Post()
  @RequirePermissions(Permission.REVIEW_CREATE)
  create(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Body() dto: CreateReviewDto,
    @CoreHubAccessToken() token: string,
  ) {
    return this.places.addReview(user, placeId, dto, token);
  }

  @Patch(':reviewId')
  @RequirePermissions(Permission.REVIEW_UPDATE_OWN)
  update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.places.updateReview(user, placeId, reviewId, dto);
  }

  @Delete(':reviewId')
  @RequirePermissions(Permission.REVIEW_DELETE_ANY, Permission.REVIEW_DELETE_OWN)
  remove(
    @CurrentUser() user: CoreHubIdentity,
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    return this.places.removeReview(user, placeId, reviewId);
  }
}
