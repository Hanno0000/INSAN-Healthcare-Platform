import { IsDefined } from 'class-validator';

/**
 * Fixes TD-001: the Settings update endpoint previously accepted
 * `@Body() body: { value: any }` with no validation at all, so malformed or
 * empty payloads were silently persisted. Setting values are intentionally
 * heterogeneous (string, number, boolean, or JSON object depending on the
 * key), so we validate presence rather than a specific shape — `@IsDefined`
 * rejects missing/undefined values while still allowing any concrete type.
 */
export class UpdateSettingDto {
  @IsDefined({ message: 'value is required' })
  value: any;
}
