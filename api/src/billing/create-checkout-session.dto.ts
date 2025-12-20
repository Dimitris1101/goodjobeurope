// C:\job-matching\api\src\billing\create-checkout-session.dto.ts

import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  planCode!: string; // e.g. "VIP_MEMBER", "COMPANY_SILVER"

  @IsString()
  invoiceSeries!: 'APY' | 'TPY'; // we'll validate logically in controller if needed

  // Billing fields (optional for APY, required for TPY on frontend side)
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerVat?: string;

  @IsOptional()
  @IsString()
  customerCountry?: string;

  @IsOptional()
  @IsString()
  customerCity?: string;

  @IsOptional()
  @IsString()
  customerPostalCode?: string;

  @IsOptional()
  @IsEmail()
  invoiceEmail?: string;
}
