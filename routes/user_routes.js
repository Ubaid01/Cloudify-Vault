import express from "express" ;
import * as userController from '../controllers/user_controller.js' ;
import * as authController from '../controllers/auth_controller.js' ;

const router = express.Router() ;

router.post( '/signup' , userController.uploadImage , userController.preprocessImage , authController.signup ) ;
router.post( '/login', authController.login ) ;
router.get( '/logout', authController.logout ) ;
router.get( '/stats' , userController.getUserStats ) ;

router.use( authController.protect ) ;
router.post( '/refresh-token', authController.refreshToken ) ; // Set someInterval to check this.
router.post( '/uploads', userController.allowedFiles, userController.uploadFiles , userController.addUploads ) ;
router.delete( '/delete-file' , userController.deleteUploads ) ; // ? AS public_id Also has '/' separators SO route won't be matched if passed as route param HENCE pass as query params.

router.use( authController.isAdmin ) ;
router.route('/').get( userController.getAllUsers ).post( userController.createUser ) ;
router.route('/:id').get( userController.getUser ).delete( userController.deleteUser ) ;

export default router ;