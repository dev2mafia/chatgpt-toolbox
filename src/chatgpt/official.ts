import {
  ChatCompletionRequestMessage,
  Configuration,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
  OpenAIApi,
} from 'openai'
import { httpsProxyAgent } from '../utils/agent'

export type ChatMessage = ChatCompletionRequestMessage

export class OfficialChatGPTAPI {
  private apiKey: string

  private readonly defaultModel = 'gpt-3.5-turbo'

  constructor(apiKey: string = process.env.OPENAI_API_KEY as string) {
    this.apiKey = apiKey
  }

  get client() {
    return new OpenAIApi(
      new Configuration({
        apiKey: this.apiKey,
      }),
    )
  }

  async createChatCompletion(
    request: CreateChatCompletionRequest,
  ): Promise<CreateChatCompletionResponse> {
    request.model = request.model ?? this.defaultModel

    const completion = await this.client.createChatCompletion(
      {
        temperature: 1,
        frequency_penalty: 0.5,
        max_tokens: 1000,
        ...request,
      },
      {
        responseType: request.stream ? 'stream' : 'json',
        httpsAgent: httpsProxyAgent,
      },
    )
    return completion.data
  }

  async checkIsValidKey(): Promise<boolean> {
    try {
      await this.client.listModels({
        httpsAgent: httpsProxyAgent,
      })
      return true
    } catch (error) {
      return false
    }
  }
}
