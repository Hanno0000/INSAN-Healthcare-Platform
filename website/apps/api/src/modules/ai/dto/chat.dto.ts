import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsIn, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  // 'system' is intentionally excluded — the system prompt is set server-side
  // only (see AiService.processChat). Allowing a client-supplied 'system'
  // message would let a caller inject/override the assistant's instructions.
  @IsIn(['user', 'assistant', 'ai'])
  role: string;

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
