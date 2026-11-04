import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import helmet from "helmet";

import { budgetRoutes } from "./routes/budgetRoutes";

const app = express();



app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.get("/health", (_request: Request, response: Response) => {
  response.status(200).json({
    status: "ok",
    service: "orcamento-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/budgets", budgetRoutes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    error: "Rota não encontrada.",
  });
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    const type = error && typeof error === "object" && "type" in error
      ? error.type : undefined;
    if (type === "entity.parse.failed") {
      response.status(400).json({ error: "Corpo JSON inválido." });
      return;
    }
    if (type === "entity.too.large") {
      response.status(413).json({ error: "Corpo da requisição excede o limite de 1 MB." });
      return;
    }
    console.error(error);

    response.status(500).json({
      error: "Erro interno do servidor.",
    });
  },
);

export { app };
