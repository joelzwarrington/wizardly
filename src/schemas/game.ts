import { z } from 'zod'
import players from '@/schemas/players'
import round from '@/schemas/round'

const schema = z.object({
  id: z.string().uuid(),
  datetime: z.string().datetime(),
  completed: z.boolean(),
  players: players,
  rounds: round.array()
})

export default schema

export type Game = z.infer<typeof schema>
