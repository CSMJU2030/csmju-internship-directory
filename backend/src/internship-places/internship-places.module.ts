import { Module } from '@nestjs/common';
import { CoreHubModule } from '../core-hub/core-hub.module';
import { InternshipPlacesController } from './internship-places.controller';
import { InternshipPlacesService } from './internship-places.service';
import { PlaceReviewsController } from './place-reviews.controller';

@Module({
  imports: [CoreHubModule],
  controllers: [InternshipPlacesController, PlaceReviewsController],
  providers: [InternshipPlacesService],
})
export class InternshipPlacesModule {}
