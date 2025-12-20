import { Type, Transform, plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Length,
  ValidateNested,
} from 'class-validator';

// Αν θες, βάλε το enum εδώ (ή από @prisma/client)
export enum CompanyPlanDto {
  SIMPLE = 'SIMPLE',
  SILVER = 'SILVER',
  GOLDEN = 'GOLDEN',
}

export class SelectUserPlanDto {
  //  "FREE_MEMBER" | "VIP_MEMBER" | "COMPANY_BASIC" | "COMPANY_SILVER" | "COMPANY_GOLDEN"
  @IsString()
  plan!: string;
}

export class LanguageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  level?: string; // A1..C2 / NATIVE / FLUENT κλπ
}

export class SelectCompanyPlanDto {
  @IsEnum(CompanyPlanDto)
  plan!: CompanyPlanDto;

  @IsOptional()
  @Type(() => Number)
  jobLimitOverride?: number | null;
}

export class UpdateCandidateProfileDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;

  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() @Length(0, 140) headline?: string;

  // --- ΝΕΑ ΠΕΔΙΑ ---
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() birthDate?: string; // στείλε μόνο όταν έχεις τιμή
  @IsOptional() @IsString() countryOfOrigin?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean() driverLicenseA?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() driverLicenseM?: boolean;

  @IsOptional() @IsString() preferredLanguage?: string;

  @IsOptional() @IsUrl({ require_tld: false }) referenceLetterUrl?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean() degree?: boolean;
  @IsOptional() @IsString() degreeTitle?: string;

  @IsOptional() @IsPhoneNumber('GR') phone?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsString() volunteering?: string;

  @IsOptional() @IsUrl({ require_tld: false }) avatarUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) cvUrl?: string;

  // Προαιρετικά text/csv (αν τα χρησιμοποιείς στο frontend)
  @IsOptional() @IsString() skillsText?: string;
  @IsOptional() @IsString() skillsCsv?: string;

  // ---- LANGUAGES FIX ----
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;

    let arr = value;
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch {
        return undefined; // άκυρο JSON => το αγνοούμε
      }
    }

    if (!Array.isArray(arr)) return undefined;

    // Κάνε κάθε item instance του LanguageDto
    return arr.map((item) => plainToInstance(LanguageDto, item));
  }, { toClassOnly: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @IsOptional() @Type(() => Boolean) @IsBoolean() profileCompleted?: boolean;
}

export class UpdateCompanyProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() country?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUrl({ require_tld: false })
  website?: string;

  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() heading?: string;
  @IsOptional() @IsString() address?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUrl({ require_tld: false })
  coverUrl?: string;
}

export class SelectPlanDto {
  @IsEnum(CompanyPlanDto)
  plan!: CompanyPlanDto;

  // Προαιρετικά: explicit override στο όριο αγγελιών από admin UI
  @IsOptional()
  @Type(() => Number)
  jobLimitOverride?: number | null;
}