import { Colors, EmbedBuilder } from 'discord.js'

import { EmojiModifier } from '@adventure-bot/game/Emoji'
import { findOrCreateCharacter, statField } from '@adventure-bot/game/character'
import store from '@adventure-bot/game/store'
import { divineBlessingGranted } from '@adventure-bot/game/store/slices/characters'
import { CommandHandlerOptions, asset } from '@adventure-bot/game/utils'

export async function divineBlessing({
  interaction,
}: CommandHandlerOptions): Promise<void> {
  store.dispatch(divineBlessingGranted(interaction.user.id))
  const art = asset('fantasy', 'magic', 'a divine blessing')
  const character = findOrCreateCharacter(interaction.user)

  await interaction.channel?.send({
    files: [art.attachment],
    embeds: [
      new EmbedBuilder({
        title: `${interaction.user.username} is blessed by the Divine!`,
        description: `You gain a permanent ${EmojiModifier(
          'maxHP',
          1
        )} Max Health!`,
        color: Colors.Gold,
        fields: [statField(character, interaction, 'maxHP')],
      }).setImage(art.attachmentString),
    ],
  })
}
