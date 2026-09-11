import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator'

export class SettingUpdateItem {
  @IsString()
  @MaxLength(64)
  key!: string

  /** 任意 JSON 值（对象 / 数组 / 字符串 / 数字 / 布尔） */
  @IsObject()
  value!: unknown
}

export class UpdateSettingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SettingUpdateItem)
  updates!: SettingUpdateItem[]
}
