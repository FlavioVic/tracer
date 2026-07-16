import cors from "cors";
import express from "express";
import { redirectController } from "./controllers/redirect.controller";
import { errorHandler } from "./middlewares/error-handler";
import { authRoutes } from "./routes/auth.routes";
import { linkRoutes } from "./routes/link.routes";
import { userRoutes } from "./routes/user.routes";

const app = express();

app.use(cors());
app.use(express.json());

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
