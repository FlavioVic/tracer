import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { linkController } from "../controllers/link.controller";
import { authGuard } from "../middlewares/auth-guard";
import { validate } from "../middlewares/validate";
import { createLinkSchema } from "../schemas/link.schema";

export const linkRoutes = Router();

// Toda rota de gestão de link exige usuário autenticado.
linkRoutes.use(authGuard);

linkRoutes.post("/", validate(createLinkSchema), linkController.create);
linkRoutes.get("/", linkController.list);
linkRoutes.patch("/:id/desativar", linkController.deactivate);
linkRoutes.get("/:id/analytics", analyticsController.getLinkAnalytics);
