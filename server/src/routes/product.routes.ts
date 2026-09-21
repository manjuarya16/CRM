import { Router, Request, Response } from "express";
import productService from "@/services/productService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req: Request, res: Response) => {
  productService.getProducts(req, res);
});

router.post("/create", requireAuth, (req: Request, res: Response) => {
  productService.createProduct(req, res);
});

router.post("/", requireAuth, (req: Request, res: Response) => {
  productService.createProduct(req, res);
});

router.put("/update/:id", requireAuth, (req: Request, res: Response) => {
  productService.updateProduct(req, res);
});

router.put("/:id", requireAuth, (req: Request, res: Response) => {
  productService.updateProduct(req, res);
});

router.delete("/delete/:id", requireAuth, (req: Request, res: Response) => {
  productService.deleteProduct(req, res);
});

router.delete("/:id", requireAuth, (req: Request, res: Response) => {
  productService.deleteProduct(req, res);
});

router.get("/:id", requireAuth, (req: Request, res: Response) => {
  productService.getProductById(req, res);
});

export default router;
