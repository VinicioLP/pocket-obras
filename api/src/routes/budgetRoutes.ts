import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { requireAuth } from "../middleware/requireAuth";

import { generateBudgetPdf, type BudgetForPdf } from "../services/budgetPdf";

const budgetRoutes = Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

budgetRoutes.get(
  "/:budgetId/pdf",
  requireAuth,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { budgetId } = request.params;

      if (typeof budgetId !== "string" || !UUID_PATTERN.test(budgetId)) {
        response.status(400).json({
          error: "Identificador do orçamento inválido.",
        });

        return;
      }

      const { data, error } = await request.supabase
        .from("budgets")
        .select(
          `
          id,
          code,
          title,
          description,
          status,
          issue_date,
          valid_until,
          discount,
          notes,
          client:clients (
            name
          ),
          items:budget_items (
            id,
            name,
            description,
            unit,
            quantity,
            unit_price,
            sort_order
          )
        `,
        )
        .eq("id", budgetId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        response.status(404).json({
          error: "Orçamento não encontrado.",
        });

        return;
      }

      const budget = data as unknown as BudgetForPdf;

      const pdf = await generateBudgetPdf(budget);

      const safeCode = String(budget.code || budget.id).replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );

      response.setHeader("Content-Type", "application/pdf");

      response.setHeader(
        "Content-Disposition",
        `attachment; filename="orcamento-${safeCode}.pdf"`,
      );

      response.setHeader("Content-Length", String(pdf.length));

      response.setHeader("Cache-Control", "private, no-store");

      response.status(200).send(pdf);
    } catch (error) {
      next(error);
    }
  },
);

export { budgetRoutes };
