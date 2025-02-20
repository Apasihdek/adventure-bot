import { CommandInteraction, StringSelectMenuBuilder } from 'discord.js'

import { Item } from '@adventure-bot/game/equipment'
import { truncate } from '@adventure-bot/game/utils'

export function buyList({
  inventory,
}: {
  inventory: Item[]
  interaction: CommandInteraction
}): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder({
    customId: 'item',
    placeholder: 'Which item would you like to buy?',
    options: inventory.slice(0, 24).map((item) => ({
      label: item.name,
      description: truncate(`${item.goldValue}g ${item.description}`, 100),
      value: item.id,
    })),
  })
}
