import express from "express"
import { Router } from "express"
import cmsController from "../controllers/cmsController.js"; 
import { verifyToken as authenticate, requireAdmin as authorize } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validation.js";


const router = express.Router()

/* ----------  PUBLIC CMS ENDPOINTS ---------- */
router.get("/navigation", cmsController.getNavigation);
router.get("/content/:type", cmsController.getContent);
router.get("/settings", cmsController.getSettings);
router.get("/banners", cmsController.getBanners);
router.get("/homepage", cmsController.getHomepageContent);

/* ----------  PROTECTED (ADMIN) CMS ENDPOINTS ---------- */
router.use(authenticate);          // JWT check
router.use(authorize);             // must be admin

router.post("/navigation", cmsController.updateNavigation);

router.put("/content/:type", cmsController.updateContent);

router.put("/settings", cmsController.updateSettings);

router.post("/banners", cmsController.createBanner);
router.put("/banners/:id", cmsController.updateBanner);
router.delete("/banners/:id", cmsController.deleteBanner);

router.put("/homepage", cmsController.updateHomepageContent);


export default router

