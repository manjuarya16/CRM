import { Router, Request, Response } from "express";
import { pool } from "@/config/db";
import { requireAuth } from "@/middleware/auth";
import { PersonService } from "@/services/person.service";
import { OrganizationService } from "@/services/organization.service";
import { logger } from "@/utils/logger";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.search || "").trim();
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));

  if (!q) {
    res.json({
      success: true,
      data: {
        leads: [],
        contacts: [],
        organizations: [],
        quotes: [],
        products: [],
        activities: [],
      },
    });
    return;
  }

  try {
    const [
      leadsRes,
      contactsRes,
      organizationsRes,
      quotesRes,
      productsRes,
      activitiesRes,
    ] = await Promise.allSettled([
      pool.query(
        "SELECT * FROM public.fn_get_all_leads($1::varchar, 1, $2::int, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)",
        [q, limit]
      ),
      PersonService.getAll({ page: 1, perPage: limit, search: q }),
      OrganizationService.getAll({ page: 1, perPage: limit, search: q }),
      pool.query("SELECT * FROM public.fn_get_all_quotes($1, 1, $2, NULL)", [
        q,
        limit,
      ]),
      pool.query("SELECT * FROM public.fn_get_all_products($1, 1, $2)", [
        q,
        limit,
      ]),
      pool.query(
        "SELECT * FROM public.fn_get_all_activities($1, 1, $2, NULL, NULL)",
        [q, limit]
      ),
    ]);

    const leads =
      leadsRes.status === "fulfilled" ? leadsRes.value.rows || [] : [];
    const contacts =
      contactsRes.status === "fulfilled" ? contactsRes.value.rows || [] : [];
    const organizations =
      organizationsRes.status === "fulfilled"
        ? organizationsRes.value.rows || []
        : [];
    const quotes =
      quotesRes.status === "fulfilled" ? quotesRes.value.rows || [] : [];
    const products =
      productsRes.status === "fulfilled" ? productsRes.value.rows || [] : [];
    const activities =
      activitiesRes.status === "fulfilled"
        ? activitiesRes.value.rows || []
        : [];

    res.json({
      success: true,
      data: {
        leads,
        contacts,
        organizations,
        quotes,
        products,
        activities,
      },
    });
  } catch (error: any) {
    logger.error({ error, q }, "Mega search failed");
    res.status(500).json({
      success: false,
      message: error?.message || "Search failed",
    });
  }
});

export default router;
