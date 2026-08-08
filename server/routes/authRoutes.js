import { Router } from "express"
import { login, logout, me, register } from "../controllers/authController.js";
import { auth } from "../middlewares/authMiddleWare.js";

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', auth, me);

export default authRouter;