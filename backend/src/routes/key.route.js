import express from 'express';
import { 
  getUserPrivateKey,
  getReceiverPublicKey,
  getContactPublicKey,
  updateEvolutionCount,
  updateContactPublicKey,
  upsertUserKeys 
} from '../controllers/key.controller.js'; // replace with actual controller file
import { protectRoute } from "../middleware/auth.middleware.js";


const router = express.Router();

// Route to get the private key of the logged-in user
router.get('/user/private-key', protectRoute, getUserPrivateKey);

// Route to get the public key of the receiver (contact)
router.get('/user/receiver-public-key/:userId',protectRoute,  getReceiverPublicKey);  // contactId as a parameter

// Route to get the public key of a specific contact
router.get('/contact/:id/public-key', protectRoute, getContactPublicKey);

// Route to update the evolution count of a contact
router.put('/contact/:id/evolution', protectRoute, updateEvolutionCount);  // contactId as a parameter

// Route to update the public key of a specific contact
router.put('/contact/:id/public-key', protectRoute, updateContactPublicKey);  // contactId as a parameter

// Route to upsert the user's public and private keys
router.put('/user/keys', protectRoute, upsertUserKeys);  // Public and Private keys update

export default router;
