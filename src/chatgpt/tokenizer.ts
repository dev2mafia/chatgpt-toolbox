import GPT3Tokenizer from 'gpt3-tokenizer'
import { ChatMessage } from './official'

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })

function countTokens(str: string) {
  const encoded = tokenizer.encode(str)
  return encoded.bpe.length
}

// https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
export function countMessagesTokens(messages: ChatMessage[]) {
  let n = 0
  for (const m of messages) {
    n += countTokens(m.content)
    n += countTokens(m.role)
  }
  return n + 2
}
