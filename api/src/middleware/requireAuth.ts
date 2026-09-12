import type { NextFunction, Request, Response } from "express";

import { createUserSupabaseClient } from "../lib/supabase";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const authorization = request.headers.authorization;

    if (!authorization) {
      response.status(401).json({
        error: "Token de autenticação não informado.",
      });

      return;
    }

    const [scheme, accessToken] = authorization.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !accessToken) {
      response.status(401).json({
        error: "Token de autenticação inválido.",
      });

      return;
    }

    const supabase = createUserSupabaseClient(accessToken);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      response.status(401).json({
        error: "Sessão inválida ou expirada.",
      });

      return;
    }

    request.supabase = supabase;
    request.user = user;

    next();
  } catch (error) {
    console.error("Erro de autenticação:", error);

    response.status(401).json({
      error: "Não foi possível validar a sessão.",
    });
  }
}
