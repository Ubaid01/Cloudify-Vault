import express from "express" ;
import * as viewController from '../controllers/view_controller.js' ;
import * as authController from '../controllers/auth_controller.js' ;
import * as userController from "../controllers/user_controller.js";
const router = express.Router() ;

router.get( '/' , authController.isLoggedIn , userController.getUserStats , viewController.getOverview ) ;
router.get( '/signup' , viewController.getSignup ) ;
router.get( '/login' , viewController.getLogin ) ;
router.get( '/my-uploads' , authController.protect , viewController.getDashboard ) ;
export default router ;