import { randomUUID } from 'crypto'

import { Potion } from '@adventure-bot/game/equipment'

export const potionOfVigor = (): Potion => ({
  id: randomUUID(),
  type: 'potion',
  description: 'magic potion with glowing white liquid',
  asset: 'magic potion with glowing white liquid',
  goldValue: 20,
  name: 'Potion of Vigor',
  useEffects: {
    randomEffect: ['invigorated'],
  },
  usable: true,
  equippable: false,
  sellable: true,
  tradeable: true,
})
