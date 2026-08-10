import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('classes/:id/checkout')
  createCheckout(@Param('id') id: string, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(id, dto.email, dto.origin);
  }

  // Stripe calls this directly (not the browser) once a payment completes.
  // Needs the raw request body (not the parsed JSON) to verify the
  // signature — see main.ts's `rawBody: true` and req.rawBody below.
  @Post('webhooks/stripe')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing Stripe signature or raw body.');
    }
    const event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);
    await this.paymentsService.handleWebhookEvent(event);
    return { received: true };
  }
}
