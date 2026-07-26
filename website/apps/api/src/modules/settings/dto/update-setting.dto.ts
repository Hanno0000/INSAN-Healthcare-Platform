import { IsDefined } from 'class-validator';

/**
 * Validates that the Settings update endpoint receives a value.
 * Setting values are intentionally heterogeneous (string, number, boolean,
 * or JSON object depending on the key), so we validate presence only.
 */
export class UpdateSettingDto {
  @IsDefined({ message: 'value is required' })
  value: any;
}
