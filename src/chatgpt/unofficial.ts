import { v4 as uuidv4 } from 'uuid'
import fetch, { Headers, RequestRedirect } from 'node-fetch'
import { debug } from '../utils/debug'
import _ from 'lodash'
import { httpsProxyAgent } from '../utils/agent'
import moment from 'moment'

const log = debug('chatgpt:unofficial')

export enum CHATGPT_MODEL {
  TEXT_DAVINCI_002_RENDER_SHA = 'text-davinci-002-render-sha',
  GPT_4 = 'gpt-4',
}

export type AuthInfo = {
  cookies: Record<string, string>
  sessionCookie: string
  accessToken: string
}

export class UnofficialChatGPTAPI {
  #authInfo: AuthInfo = {
    cookies: {},
    sessionCookie: '',
    accessToken: '',
  }

  set authInfo({ cookies, sessionCookie, accessToken }: Partial<AuthInfo>) {
    Object.assign(this.#authInfo, { cookies, sessionCookie, accessToken })
  }

  get authInfo() {
    return this.#authInfo
  }

  async createChatCompletion(params: {
    prompt: string
    conversationId?: string
    parentMessageId?: string
    model?: CHATGPT_MODEL
  }) {
    const {
      prompt,
      conversationId,
      parentMessageId = uuidv4(),
      model = CHATGPT_MODEL.TEXT_DAVINCI_002_RENDER_SHA,
    } = params

    const { cookies, sessionCookie, accessToken } = this.#authInfo

    const sessionKey = '__Secure-next-auth.session-token'

    const cookieStr = _(cookies)
      .entries()
      .filter(([k, v]) => k !== sessionKey)
      .map(([k, v]) => `${k}=${v}`)
      .concat([sessionKey, sessionCookie])
      .join('; ')
      .valueOf()

    const headers = new Headers()
    headers.append('authority', 'chat.openai.com')
    headers.append('authorization', `Bearer ${accessToken}`)
    headers.append('dnt', '1')
    headers.append('Cookie', cookieStr)
    headers.append('User-Agent', 'Apifox/1.0.0 (https://www.apifox.cn)')
    headers.append('content-type', 'application/json')
    headers.append('Accept', '*/*')
    headers.append('Host', 'chat.openai.com')
    headers.append('Connection', 'keep-alive')

    const body = this.#getBody({
      conversationId,
      parentMessageId,
      prompt,
      model,
    })

    const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: 'follow' as RequestRedirect,
      agent: httpsProxyAgent,
    }

    // log('[ask] request: %j', requestOptions)

    const resp = await fetch(
      'https://chat.openai.com/backend-api/conversation',
      requestOptions,
    )
    log('[ask]: status=%s, statusText=%s', resp.status, resp.statusText)
    if (resp.status !== 200) {
      throw new Error('fetch conversation failed')
    }
    return resp.text()
  }

  responseParser(resp: string) {
    const result = {
      message: '',
      messageId: '',
      conversationId: '',
    }
    const lines = resp.split('\n').filter((line) => !!line.trim())
    lines.map((line) => {
      const message = line.replace(/^data: /, '').trim()
      // console.log(message)
      if (message === '[DONE]') {
        log('[parser]: [DONE]')
      } else if (message === 'event: ping') {
        log('[parser]: [event: ping]')
      } else if (message.startsWith('{')) {
        try {
          const parsed = JSON.parse(message)
          const text = (parsed.message.content.parts[0] || '').trim()
          result.conversationId = parsed.conversation_id
          result.messageId = parsed.message.id
          if (text) {
            result.message = text
          }
        } catch (err) {
          log(
            '[parser]: Could not JSON parse stream message=%s, errMsg=%s, err=%o',
            message,
            (err as Error).message,
            err,
          )
        }
      } else if (moment(message).isValid()) {
        log('[parser]: [event: time]: %s', moment(message).format())
      }
    })
    log('[parser]: %j', result)
    return result
  }

  #getBody(params: {
    conversationId?: string
    parentMessageId: string
    prompt: string
    model: CHATGPT_MODEL
  }) {
    const { conversationId, parentMessageId, prompt: text, model } = params
    log('conversationId=%s', conversationId)
    log('parentMessageId=%s', parentMessageId)
    return {
      action: 'next',
      messages: [
        {
          id: uuidv4(),
          author: {
            role: 'user',
          },
          role: 'user',
          content: {
            content_type: 'text',
            parts: [text],
          },
        },
      ],
      conversation_id: conversationId,
      parent_message_id: parentMessageId,
      model,
    }
  }
}
