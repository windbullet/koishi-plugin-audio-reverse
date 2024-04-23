import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-ffmpeg'
import { } from 'koishi-plugin-silk'

export const name = 'audio-reverse'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export const inject = ["ffmpeg", "silk"]

export const using = "支持调用指令后发语音和回复语音两种方法"

export function apply(ctx: Context) {
  ctx.command("倒放语音")
    .usage("支持调用指令后发语音和回复语音两种方法")
    .action(async ({ session }) => {
      let elements
      if (session.quote) {
        elements = session.quote.elements
      } else {
        await session.send("在60秒内发送想要倒放的语音")
        let msg = await session.prompt(60000)
        if (msg !== undefined) {
          elements = h.parse(msg)
        }
      }
      let audio = h.select(elements, 'audio')
      if (audio.length > 0) {
        const res = await ctx.http(audio[0].attrs.src, { responseType: 'arraybuffer' })
        const type = res.headers.get('content-type')
        let input = Buffer.from(res.data)
        if (session.platform === 'red') {
          const pcm = await ctx.silk.decode(res.data, 24000)
          const wav = await ctx.ffmpeg
            .builder()
            .input(Buffer.from(pcm.data))
            .inputOption('-f', 's16le', '-ar', '24000', '-ac', '1')
            .outputOption('-f', 'wav')
            .run("buffer")
          input = wav
        }
        const reversedAudio = await ctx.ffmpeg
          .builder()
          .input(input)
          .outputOption('-af', 'areverse', '-f', 'wav')
          .run("buffer")
        if (reversedAudio.length === 0) return "音频倒放失败"
        return h.audio(reversedAudio, type)
      } else {
        return "这看上去不是音频"
      }
    })
}
