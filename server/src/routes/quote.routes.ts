import { Router, Request, Response } from "express";
import quoteService from "@/services/quoteService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req: Request, res: Response) => {
  quoteService.getQuotes(req, res);
});

router.post("/create", requireAuth, (req: Request, res: Response) => {
  quoteService.createQuote(req, res);
});

router.put("/update/:id", requireAuth, (req: Request, res: Response) => {
  quoteService.updateQuote(req, res);
});

router.delete("/delete/:id", requireAuth, (req: Request, res: Response) => {
  quoteService.deleteQuote(req, res);
});

router.get("/:id/items", requireAuth, (req: Request, res: Response) => {
  quoteService.getQuoteItems(req, res);
});

router.post("/:id/items", requireAuth, (req: Request, res: Response) => {
  quoteService.addQuoteItem(req, res);
});

router.delete("/items/:itemId", requireAuth, (req: Request, res: Response) => {
  quoteService.deleteQuoteItem(req, res);
});

router.get("/:id", requireAuth, (req: Request, res: Response) => {
  quoteService.getQuoteById(req, res);
});

export default router;
