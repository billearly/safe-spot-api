import { connect, model, Schema } from "mongoose";
import { ClientInfo, Game, GameBoard, Move, Tile } from "./types";

type MongoConnection = typeof import("mongoose");
let connection: MongoConnection;

connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log("connected");
    connection = conn;
  })
  .catch((e) => {
    console.error(e);
  });

export const saveGame = async (game: Game): Promise<void> => {
  if (!connection) {
    throw new Error("No db connection");
  }

  try {
    const gameModel = new GameModel(game);
    await gameModel.save();
  } catch (e) {
    console.error(e);
  }
};

export const getGame = async (displayId: string): Promise<Game> => {
  if (!connection) {
    throw new Error("No connection");
  }

  try {
    const model = await GameModel.findOne({ displayId });
    const game = model?.toObject();
    return game;
  } catch (e) {
    console.error(e);
  }
};

export const updateGame = async (game: Game): Promise<void> => {
  if (!connection) {
    throw new Error("No connection");
  }

  try {
    await GameModel.findOneAndUpdate({ displayId: game.displayId }, game);
  } catch (e) {
    console.error(e);
  }
};

const tileSchema = new Schema<Tile>(
  {
    row: Number,
    column: Number,
    isSafe: Boolean,
    isRevealed: Boolean,
    displayNum: Number,
  },
  { _id: false }
);

const clientInfoSchema = new Schema<ClientInfo>(
  {
    privateId: String,
    publicId: String,
    socketId: String,
  },
  { _id: false }
);

const moveSchema = new Schema<Move>(
  {
    tile: tileSchema,
    client: clientInfoSchema,
  },
  { _id: false }
);

const gameSchema = new Schema<Game>({
  displayId: String,
  board: [[tileSchema]],
  isStarted: Boolean,
  creator: clientInfoSchema,
  player1: clientInfoSchema,
  player2: clientInfoSchema,
  moves: [moveSchema],
});

const GameModel = model<Game>("Game", gameSchema);
