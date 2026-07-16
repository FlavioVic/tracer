import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { redirectController } from "./controllers/redirect.controller";
import { errorHandler } from "./middlewares/error-handler";
import { authRoutes } from "./routes/auth.routes";
import { linkRoutes } from "./routes/link.routes";
import { userRoutes } from "./routes/user.routes";

const FRONTEND_URL: string =
  process.env.FRONTEND_URL ??
  (() => {
    throw new Error("FRONTEND_URL não definido no .env");
  })();

const app = express();

// Render (e qualquer PaaS atrás de load balancer) entrega a requisição via um
// único hop de proxy — sem isso, req.ip vira o IP interno do proxy em vez do
// IP real do visitante, quebrando ipHash e a geolocalização do clique.
app.set("trust proxy", 1);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/users", userRoutes);

// Redirecionamento público — precisa vir depois das rotas acima, senão
// "/:slug" capturaria qualquer path de um segmento só antes delas.
app.get("/:slug", redirectController.redirect);

// Precisa ser o último app.use — é aqui que erros lançados/rejeitados
// em qualquer rota acabam parando.
app.use(errorHandler);

export default app;
