export const extraBlockLabels = [['CALLOUT', 'Callout'], ['QUOTE', 'Quote'], ['TODO_LIST', 'To-do list'], ['DIVIDER', 'Divider'], ['TABLE', 'Table']] as const
export type ExtraBlockType = typeof extraBlockLabels[number][0]
export function isExtraBlockType(type: string): type is ExtraBlockType {
  return extraBlockLabels.some(([value]) => value === type)
}
