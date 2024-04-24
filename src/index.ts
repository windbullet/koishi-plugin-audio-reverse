import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-ffmpeg'
import { } from 'koishi-plugin-silk'

export const name = 'audio-reverse'
export const inject = ['ffmpeg', 'silk']

export const usage = '支持调用指令后发语音和回复语音两种方法'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('audio-reverse', '对语音进行倒放')
    .alias('倒放语音')
    .usage('支持调用指令后发语音和回复语音两种方法')
    .option('speed', '-s <speed:number> 设置倍速', { fallback: 1 })
    .action(async ({ session, options }) => {
      if (options.speed <= 0) return '倍速必须大于0'

      let elements: h[] = []
      if (session.quote) {
        elements = session.quote.elements
      } else {
        await session.send('在60秒内发送想要倒放的语音')
        let msg = await session.prompt(60000)
        if (msg !== undefined) {
          elements = h.parse(msg)
        }
      }

      const audio = h.select(elements, 'audio')
      if (audio.length === 0) return '这看上去不是音频。'

      const res = await ctx.http(audio[0].attrs.src, { responseType: 'arraybuffer' })
      if (!ctx.silk.isSilk) throw new Error('请更新 silk 插件至最新版本')

      let reversedAudio: Buffer
      const outputOption = ['-f', 'wav', '-af', `areverse,atempo=${options.speed}`]
      if (ctx.silk.isSilk(res.data)) {
        const pcm = await ctx.silk.decode(res.data, 24000)
        reversedAudio = await ctx.ffmpeg
          .builder()
          .input(Buffer.from(pcm.data))
          .inputOption('-f', 's16le', '-ar', '24000', '-ac', '1')
          .outputOption(...outputOption)
          .run('buffer')
      } else {
        reversedAudio = await ctx.ffmpeg
          .builder()
          .input(Buffer.from(res.data))
          .outputOption(...outputOption)
          .run('buffer')
      }
      if (reversedAudio.length === 0) return '音频倒放失败。'

      return h.audio(reversedAudio, 'audio/vnd.wave')
    })
}
