import type { Game } from '@/schemas/game'
import { useGames } from '@/stores/games'

const uuid = '55a5d47d-6942-4e93-8e19-4ca8c7477ab6'

vi.mock('uuid', () => {
  return {
    v4: vi.fn(() => uuid)
  }
})

describe('useGames', () => {
  it('starts game and returns uuid', () => {
    const id = useGames.getState().start([{ name: 'Joel' }])
    expect(id).toEqual(uuid)

    const game = useGames.getState().games[id]
    expect(game).toMatchObject({
      id: uuid,
      players: [{ name: 'Joel' }]
    })
  })

  it('advances', () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))

    const id = useGames
      .getState()
      .start([
        { name: 'Rory' },
        { name: 'Calisto' },
        { name: 'Howl' },
        { name: 'Prince' }
      ])

    const expected: Partial<Game> = {
      id: uuid,
      datetime: '2025-01-01T00:00:00.000Z',
      completed: false,
      players: [
        { name: 'Rory' },
        { name: 'Calisto' },
        { name: 'Howl' },
        { name: 'Prince' }
      ],
      rounds: [{ dealer: expect.any(Number), round: 1, step: 'dealing' }]
    }

    let game = useGames.getState().games[id]!
    expect(game).toMatchObject(expected)

    useGames.getState().advance({ uuid: id, from: 'dealing', trump: 'Heart' })

    game = useGames.getState().games[id]!
    expect(game).toMatchObject({
      ...expected,
      rounds: [
        {
          dealer: game!.rounds![0].dealer,
          round: 1,
          step: 'bidding',
          trump: 'Heart'
        }
      ]
    })

    useGames
      .getState()
      .advance({ uuid: id, from: 'bidding', bids: [0, 1, 2, 3] })

    game = useGames.getState().games[id]!
    expect(game).toMatchObject({
      ...expected,
      rounds: [
        {
          round: 1,
          dealer: game!.rounds![0].dealer,
          step: 'scoring',
          trump: 'Heart',
          bidding: [{ bid: 0 }, { bid: 1 }, { bid: 2 }, { bid: 3 }]
        }
      ]
    })

    useGames
      .getState()
      .advance({ uuid: id, from: 'scoring', tricks: [3, 1, 2, 0] })

    game = useGames.getState().games[id]!
    expect(game).toMatchObject({
      ...expected,
      rounds: [
        {
          round: 1,
          dealer: game!.rounds![0].dealer,
          step: 'completed',
          trump: 'Heart',
          bidding: [
            { bid: 0, actual: 3, score: -30 },
            { bid: 1, actual: 1, score: 30 },
            { bid: 2, actual: 2, score: 40 },
            { bid: 3, actual: 0, score: -30 }
          ]
        },
        {
          round: 2,
          step: 'dealing',
          dealer:
            game!.rounds![0].dealer === 3 ? 0 : game!.rounds![0].dealer + 1
        }
      ]
    })

    useGames.getState().advance({ uuid: id, from: 'dealing', trump: 'Diamond' })

    game = useGames.getState().games[id]!
    expect(game).toMatchObject({
      ...expected,
      rounds: [
        {
          round: 1,
          dealer: game!.rounds![0].dealer,
          step: 'completed',
          trump: 'Heart',
          bidding: [
            { bid: 0, actual: 3, score: -30 },
            { bid: 1, actual: 1, score: 30 },
            { bid: 2, actual: 2, score: 40 },
            { bid: 3, actual: 0, score: -30 }
          ]
        },
        {
          round: 2,
          step: 'bidding',
          dealer: game!.rounds![1].dealer,
          trump: 'Diamond'
        }
      ]
    })
  })

  it('uses the rounds previous score', () => {
    const game: Game = {
      id: uuid,
      datetime: '2025-01-01T00:00:00.000Z',
      completed: false,
      players: [
        { name: 'Rory' },
        { name: 'Calisto' },
        { name: 'Howl' },
        { name: 'Prince' }
      ],
      rounds: [
        {
          round: 1,
          step: 'completed',
          dealer: 0,
          trump: 'Heart',
          bidding: [
            { bid: 0, actual: 1, score: -10 },
            { bid: 1, actual: 0, score: -10 },
            { bid: 0, actual: 0, score: 20 },
            { bid: 0, actual: 0, score: 20 }
          ]
        },
        {
          round: 2,
          step: 'scoring',
          dealer: 1,
          trump: 'None',
          bidding: [{ bid: 2 }, { bid: 1 }, { bid: 0 }, { bid: 0 }]
        }
      ]
    }

    useGames.setState({
      games: {
        [uuid]: game
      }
    })

    useGames
      .getState()
      .advance({ uuid: uuid, from: 'scoring', tricks: [2, 0, 0, 0] })

    expect(useGames.getState().games[uuid]).toMatchObject({
      rounds: [
        {
          round: 1
        },
        {
          round: 2,
          step: 'completed',
          bidding: [
            { bid: 2, actual: 2, score: 30 },
            { bid: 1, actual: 0, score: -20 },
            { bid: 0, actual: 0, score: 40 },
            { bid: 0, actual: 0, score: 40 }
          ]
        },
        {
          round: 3
        }
      ]
    })
  })

  it("doesn't advance past the final round", () => {
    useGames.setState({
      games: {
        [uuid]: {
          id: uuid,
          datetime: '2025-01-01T00:00:00.000Z',
          completed: false,
          players: [
            { name: 'Rory' },
            { name: 'Calisto' },
            { name: 'Howl' },
            { name: 'Prince' }
          ],
          rounds: Array.from({ length: 15 }, (_, index) => ({
            round: index + 1,
            dealer: 0,
            ...(index === 14
              ? {
                  step: 'scoring',
                  trump: 'Diamond',
                  bidding: [{ bid: 0 }, { bid: 0 }, { bid: 0 }, { bid: 0 }]
                }
              : {
                  step: 'completed',
                  trump: 'Heart',
                  bidding: [
                    { bid: 0, actual: 3, score: -30 },
                    { bid: 1, actual: 1, score: 30 },
                    { bid: 2, actual: 2, score: 40 },
                    { bid: 3, actual: 0, score: -30 }
                  ]
                })
          }))
        }
      }
    })

    useGames
      .getState()
      .advance({ uuid: uuid, from: 'scoring', tricks: [0, 1, 2, 3] })

    const game = useGames.getState().games[uuid]!
    expect(game).toMatchObject({
      rounds: [
        { round: 1 },
        { round: 2 },
        { round: 3 },
        { round: 4 },
        { round: 5 },
        { round: 6 },
        { round: 7 },
        { round: 8 },
        { round: 9 },
        { round: 10 },
        { round: 11 },
        { round: 12 },
        { round: 13 },
        { round: 14 },
        { round: 15 }
      ]
    })
  })
})
