import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import helmet from "helmet";

const app = express();

const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: "*",
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
    console.error(error);

    response.status(500).json({
      error: "Erro interno do servidor.",
    });
  },
);

app.listen(port, "0.0.0.0", () => {
  console.log(`API executando em http://localhost:${port}`);
});
