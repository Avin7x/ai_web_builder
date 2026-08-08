import express from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";


const app = express();



app.use(cors({
    origin: process.env.ORIGINS.split(","),
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());


app.get("/", (req, res)=>{
    res.send("Server is Live!")
});

// Routes
app.use('/api/auth', authRouter);

// Centralized error handler
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(500).json({error: err.message});
});


const port = process.env.PORT || 3000;

// Establish a database connection before starting the server
try {
  await connectDB();

  app.listen(port, () => {
    console.log(`✓ Server running at http://localhost:${port}`);
  });
} catch (error) {
  console.error("✗ Failed to start server:", error.message);
  process.exit(1);
}