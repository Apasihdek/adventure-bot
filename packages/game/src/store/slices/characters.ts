import { PayloadAction, createAction, createSlice } from '@reduxjs/toolkit'
import { CommandInteraction } from 'discord.js'
import { clamp } from 'remeda'

import { AttackResult } from '@adventure-bot/game/attack'
import {
  Character,
  LootResult,
  equipmentFilter,
} from '@adventure-bot/game/character'
import { Encounter } from '@adventure-bot/game/encounters'
import { getSaleRate } from '@adventure-bot/game/encounters/shop'
import {
  Item,
  isAmulet,
  isArmor,
  isHat,
  isRing,
  isShield,
  isWeapon,
} from '@adventure-bot/game/equipment'
import { Monster } from '@adventure-bot/game/monster'
import { QuestId, quests } from '@adventure-bot/game/quest'
import { itemReceived, newgame } from '@adventure-bot/game/store/actions'
import { CharacterWithStats } from '@adventure-bot/game/store/selectors'
import { itemPurchased } from '@adventure-bot/game/store/slices/shop'

type AttackAction = {
  encounter?: Encounter
  attackResult: AttackResult
}

export const attacked = createAction<AttackAction>('character/attacked')
export const created = createAction<CharacterWithStats>('character/created')
export const looted = createAction<LootResult>('character/looted')

const defaultCharactersState: {
  charactersById: Record<string, Character>
  roamingMonsterIds: Record<string, true>
} = {
  charactersById: {},
  roamingMonsterIds: {},
}

const characterSlice = createSlice({
  name: 'characters',
  initialState: defaultCharactersState,
  reducers: {
    cooldownStarted(
      state,
      action: PayloadAction<{
        characterId: string
        cooldown: keyof Character['cooldowns']
        interaction: CommandInteraction
      }>
    ) {
      const { characterId, cooldown } = action.payload
      const character = state.charactersById[characterId]
      if (!character) return
      character.cooldowns[cooldown] = new Date().toString()
    },

    monsterCreated(state, action: PayloadAction<Monster>) {
      const monster = action.payload
      state.charactersById[monster.id] = monster
      state.roamingMonsterIds[monster.id] = true
    },

    questProgressed(
      state,
      action: PayloadAction<{
        interaction: CommandInteraction
        characterId: string
        questId: QuestId
        amount: number
      }>
    ) {
      const { questId, amount, characterId } = action.payload
      const quest = state.charactersById[characterId].quests[questId]
      if (!quest) return
      quest.progress += amount
      if (quest.progress > quest.totalRequired)
        quest.progress = quest.totalRequired
    },

    questCompleted(
      state,
      action: PayloadAction<{
        questId: QuestId
        characterId: string
      }>
    ) {
      const { questId, characterId } = action.payload
      delete state.charactersById[characterId].quests[questId]
    },

    goldSet(
      state,
      action: PayloadAction<{ characterId: string; gold: number }>
    ) {
      const { characterId, gold } = action.payload
      const character = state.charactersById[characterId]
      character.gold = gold
    },

    xpSet(state, action: PayloadAction<{ characterId: string; xp: number }>) {
      const { characterId, xp } = action.payload
      const character = state.charactersById[characterId]
      character.xp = xp
    },

    goldGained(
      state,
      action: PayloadAction<{
        characterId: string
        amount: number
      }>
    ) {
      const { characterId, amount } = action.payload
      state.charactersById[characterId].gold += amount
    },

    goldStolen(
      state,
      action: PayloadAction<{
        attackerId: string
        defenderId: string
        amount: number
      }>
    ) {
      const { attackerId, defenderId } = action.payload
      const attacker = state.charactersById[attackerId]
      const defender = state.charactersById[defenderId]
      const amount = defender
        ? Math.min(defender.gold, action.payload.amount)
        : action.payload.amount

      if (attacker) attacker.gold += amount
      if (defender) defender.gold -= amount
    },

    divineBlessingGranted(state, action: PayloadAction<string>) {
      const character = state.charactersById[action.payload]
      if (!character) return
      character.maxHP += 1
      character.hp += 1
    },

    itemGiven(
      state,
      action: PayloadAction<{
        fromCharacterId: string
        toCharacterId: string
        item: Item
      }>
    ) {
      const {
        fromCharacterId: fromId,
        toCharacterId: toId,
        item,
      } = action.payload
      const fromCharacter = state.charactersById[fromId]
      const toCharacter = state.charactersById[toId]
      // remove from giver's inventory and equipment
      const notIt = (i: Item) => i.id !== item.id
      fromCharacter.inventory = fromCharacter.inventory.filter(notIt)
      fromCharacter.equipment = equipmentFilter(fromCharacter.equipment, notIt)
      // give to recipient
      toCharacter.inventory.push(item)
    },

    itemRemoved(
      state,
      action: PayloadAction<{
        characterId: string
        itemId: string
      }>
    ) {
      const { characterId, itemId } = action.payload
      const character = state.charactersById[characterId]
      const notIt = (i: Item) => i.id !== itemId
      character.inventory = character.inventory.filter(notIt)
      character.equipment = equipmentFilter(character.equipment, notIt)
    },

    itemEquipped(
      state,
      action: PayloadAction<{
        characterId: string
        itemId: string
      }>
    ) {
      const { characterId, itemId } = action.payload
      const character = state.charactersById[characterId]
      if (!character) return
      const item = character.inventory.find((i) => i.id === itemId)
      if (!item) return
      if (isWeapon(item)) character.equipment.weapon = item
      if (isAmulet(item)) character.equipment.amulet = item
      if (isArmor(item)) character.equipment.armor = item
      if (isRing(item)) character.equipment.ring = item
      if (isShield(item)) character.equipment.shield = item
      if (isHat(item)) character.equipment.hat = item
    },

    itemSold(
      state,
      action: PayloadAction<{
        characterId: string
        itemId: string
        sellValue: number
      }>
    ) {
      const { characterId, itemId } = action.payload
      const character = state.charactersById[characterId]
      if (!character) return
      const item = character.inventory.find((i) => i.id === itemId)
      if (!item) return
      if (!item.sellable) return
      character.inventory = character.inventory.filter((i) => i.id !== itemId)
      character.gold += Math.round(item.goldValue * getSaleRate())
      character.equipment = equipmentFilter(
        character.equipment,
        (i) => i.id !== itemId
      )
    },

    damaged(
      state,
      action: PayloadAction<{
        character: CharacterWithStats
        amount: number
      }>
    ) {
      const {
        amount,
        character: {
          id,
          statsModified: { maxHP },
        },
      } = action.payload
      const character = state.charactersById[id]
      character.hp = clamp(character.hp - amount, {
        min: 0,
        max: maxHP,
      })

      if (character.hp > 0 && character.quests.survivor)
        character.quests.survivor.progress += amount
    },

    healed(
      state,
      action: PayloadAction<{
        character: CharacterWithStats
        amount: number
      }>
    ) {
      const { amount } = action.payload
      const { hp, id } = action.payload.character
      const { maxHP } = action.payload.character.stats
      const character = state.charactersById[id]
      if (hp > maxHP) return
      character.hp = clamp(hp + amount, {
        min: 0,
        max: maxHP,
      })
    },

    questGranted(
      state,
      action: PayloadAction<{
        characterId: string
        questId: QuestId
      }>
    ) {
      const { characterId, questId } = action.payload
      const character = state.charactersById[characterId]
      if (character.quests[questId]) return
      character.quests[questId] = { ...quests[questId] }
    },

    profileSet(
      state,
      action: PayloadAction<{ profile: string; characterId: string }>
    ) {
      const { profile, characterId } = action.payload
      const character = state.charactersById[characterId]
      character.profile = profile
    },

    purgeRoamingMonsters(state) {
      state.roamingMonsterIds = {}
    },

    healthSet(
      state,
      action: PayloadAction<{
        characterId: string
        health: number
      }>
    ) {
      const { characterId, health } = action.payload
      const character = state.charactersById[characterId]
      character.hp = health
    },

    xpAwarded(
      state,
      action: PayloadAction<{
        characterId: string
        amount: number
      }>
    ) {
      const { characterId, amount } = action.payload
      const character = state.charactersById[characterId]
      character.xp += amount
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(newgame, (state) => {
        state.charactersById = {}
        state.roamingMonsterIds = {}
      })
      .addCase(created, (state, action) => {
        state.charactersById[action.payload.id] = action.payload
      })
      .addCase(looted, (state, action) => {
        const { itemsTaken, goldTaken, looterId, targetId } = action.payload
        const looter = state.charactersById[looterId]
        const target = state.charactersById[targetId]

        looter.gold += goldTaken
        looter.inventory = [...looter.inventory, ...itemsTaken]

        target.gold -= goldTaken
        const isTakenItem = (item: Item) =>
          itemsTaken.find((i) => i.id === item.id)
        target.inventory = target.inventory.filter((item) => !isTakenItem(item))
        target.equipment = equipmentFilter(
          target.equipment,
          (item) => !isTakenItem(item)
        )
      })
      .addCase(itemPurchased, (state, action) => {
        const { characterId, item } = action.payload
        const character = state.charactersById[characterId]
        if (!character) return
        character.gold -= item.goldValue
        character.inventory.push(item)
      })
      .addCase(itemReceived, (state, action) => {
        const { characterId, item } = action.payload
        const character = state.charactersById[characterId]
        if (!character) return
        character.inventory.push(item)
      })
  },
})

export const {
  questProgressed,
  cooldownStarted,
  damaged,
  goldGained,
  goldStolen,
  goldSet,
  divineBlessingGranted,
  questGranted,
  healed,
  healthSet,
  itemEquipped,
  itemGiven,
  itemRemoved,
  itemSold,
  monsterCreated,
  profileSet,
  questCompleted,
  xpAwarded,
  xpSet,
  purgeRoamingMonsters,
} = characterSlice.actions

export const questObjectiveReached = createAction<{
  interaction: CommandInteraction
  characterId: string
  questId: QuestId
}>('character/questObjectiveReached')

export const characters = characterSlice.reducer
