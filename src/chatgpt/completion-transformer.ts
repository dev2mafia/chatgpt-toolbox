import { Transform, TransformCallback } from 'stream'

export class CompletionTransformer extends Transform {
  private textsToCheck: string[] = []
  private texts: string[] = []
  private sentence = ''

  constructor() {
    super()
  }

  get text() {
    return this.texts.join('')
  }

  endStream() {
    // console.log('\n\n\n', {
    //   texts: this.texts.length,
    //   textsToCheck: this.textsToCheck.length,
    //   sentence: this.sentence,
    // })
    this.push(null)
  }

  async checkAndPush(done = false) {
    const textToCheck = this.textsToCheck.shift()

    if (!textToCheck) {
      this.endStream()
      return
    }
    /**
     * 如果是空白文本 ' ' 或者换行符 \r\n , 则直接推送
     */
    if (textToCheck.trim() === '') {
      this.push(textToCheck)
      return
    }

    this.texts.push(textToCheck)
    let textToPush = textToCheck

    this.push(textToPush)

    if (done) {
      this.endStream()
    }
  }

  splitTextByTerminators(text: string): {
    contentBefore: string
    remainingContent: string
  } {
    // 正则表达式，用于匹配任意终止符
    const terminatorRegex = /(。|？|！|\n|\.|\?|!)+/

    // 查找匹配的终止符
    const match = text.match(terminatorRegex)

    if (match) {
      // 提取包含终止符的内容和剩余内容
      const index = match.index!
      const contentBefore = text.slice(0, index + 1)
      const remainingContent = text.slice(index + 1)

      return { contentBefore, remainingContent }
    } else {
      // 如果没有匹配到终止符，则整个空串作为内容，剩余内容为整个文本
      return { contentBefore: '', remainingContent: text }
    }
  }

  async _transform(
    chunk: any,
    encoding: BufferEncoding,
    next: TransformCallback,
  ): Promise<void> {
    const lines = chunk
      .toString()
      .split('\n')
      .filter((line: string) => line.trim() !== '')

    for (const line of lines) {
      const message = line.replace(/^data: /, '')
      if (message === '[DONE]') {
        this.sentence &&
          this.textsToCheck.push(this.sentence) &&
          (this.sentence = '')
        await this.checkAndPush(true)
        break
      }
      try {
        const parsed = JSON.parse(message)
        const text = parsed.choices[0]?.delta?.content

        if (!text) {
          continue
        }

        this.sentence += text

        const { contentBefore, remainingContent } = this.splitTextByTerminators(
          this.sentence,
        )

        // console.log({ contentBefore, remainingContent, s: this.sentence, t: text })

        if (contentBefore) {
          this.textsToCheck.push(contentBefore)
          this.sentence = remainingContent
          await this.checkAndPush()
        }
      } catch (error) {
        console.error(
          `An error occurred from [${CompletionTransformer.name}]: message=${message}`,
          error,
        )
      }
    }
    next()
  }
}
