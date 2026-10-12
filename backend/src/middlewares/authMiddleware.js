import { clerkMiddleware, getAuth } from "@clerk/express";

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;

if (!publishableKey || !secretKey) {
  throw new Error(
    "Missing CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY in backend/.env"
  );
}

export const clerkAuth = clerkMiddleware({
  publishableKey,
  secretKey,
});

export function requireUser(req, res, next) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  req.userId = userId;
  next();
}