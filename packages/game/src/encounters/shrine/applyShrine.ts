import { CommandInteraction } from 'discord.js'

import { findOrCreateCharacter } from '@adventure-bot/game/character'
import { Shrine } from '@adventure-bot/game/encounters/shrine'
import { updateQuestProgess } from '@adventure-bot/game/quest'
import { effects } from '@adventure-bot/game/statusEffects'
import store from '@adventure-bot/game/store'
import { selectCharacterEffects } from '@adventure-bot/game/store/selectors'
import { xpAwarded } from '@adventure-bot/game/store/slices/characters'
import { effectAdded } from '@adventure-bot/game/store/slices/statusEffects'

export async function applyShrine({
  interaction,
  shrine,
}: {
  interaction: CommandInteraction
  shrine: Shrine
}): Promise<void> {
  const character = findOrCreateCharacter(interaction.user)
  const effect = shrine.effect
  const isBlessed = selectCharacterEffects(
    store.getState(),
    interaction.user.id
  ).some((effect) => effect.name === effects.blessed.name)
  if (effect.duration && isBlessed) {
    effect.duration *= 2
  }
  store.dispatch(
    effectAdded({
      interaction,
      character,
      effect,
    })
  )
  updateQuestProgess({
    interaction,
    characterId: interaction.user.id,
    questId: 'blessed',
    amount: 1,
  })

  store.dispatch(
    xpAwarded({
      characterId: interaction.user.id,
      amount: 1,
    })
  )
}
