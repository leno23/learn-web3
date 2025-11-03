import { Module } from '@nestjs/common';
import { ConvertController } from './convert.controller.js';

@Module({
  imports: [],
  controllers: [ConvertController],
  providers: []
})
export class AppModule {}


