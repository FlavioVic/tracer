import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authGuard } from "../middlewares/auth-guard";
import { validate } from "../middlewares/validate";
import { changePasswordSchema, updateProfileSchema } from "../schemas/user.schema";

export const userRoutes = Router();

userRoutes.use(authGuard);

userRoutes.get("/me", userController.me);
userRoutes.patch("/me", validate(updateProfileSchema), userController.updateProfile);
userRoutes.patch(
  "/me/senha",
  validate(changePasswordSchema),
  userController.changePassword,
);
