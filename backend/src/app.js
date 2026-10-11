import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./lib/prisma.js";
import { clerkAuth, requireUser } from "./middleware/authMiddleware.js";
import { syncUser } from "./services/userService.js";

import { createClerkClient } from "@clerk/backend";
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const app = express();

app.use(helmet());
app.use(clerkAuth);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));

// Basic API health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Prism API is running",
  });
});

// Database health check
app.get("/api/health/db", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Database connection is healthy",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireUser, async (req, res, next) => {
  try {
    const clerkUser = await clerk.users.getUser(req.userId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    const user = await syncUser({
      userId: req.userId,
      email: primaryEmail?.emailAddress ?? null,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;