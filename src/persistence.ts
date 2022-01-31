import { Game } from "./types";

// TODO: THis will reach out to a data source like mongo or redis

const games = new Map<string, Game>();

export const saveGame = (game: Game): void => {
  games.set(game.id, game);
};

export const getGame = (id: string): Game => games.get(id);
