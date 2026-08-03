import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class WebChatDto {
  /**
   * Opaque per-browser id minted by the widget. Not a user id and not trusted
   * for anything but conversation continuity — it only ever groups a visitor's
   * own messages together.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'visitorId must be url-safe' })
  visitorId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;

  /** Path only — used as a scope hint. Rejected if it looks like a URL. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[A-Za-z0-9\-_/]*$/, { message: 'path must be a site-relative path' })
  path?: string;
}
