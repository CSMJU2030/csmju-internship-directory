import { Module } from '@nestjs/common';
import { CoreHubModule } from '../core-hub/core-hub.module';
import { InternshipPlacesController } from './internship-places.controller';
import { InternshipPlacesService } from './internship-places.service';
import { PlaceReviewsController } from './place-reviews.controller';
import { ReviewReportsController } from './review-reports.controller';

@Module({
  imports: [CoreHubModule],
  controllers: [InternshipPlacesController, PlaceReviewsController, ReviewReportsController],
  providers: [InternshipPlacesService],
})
export class InternshipPlacesModule {}
