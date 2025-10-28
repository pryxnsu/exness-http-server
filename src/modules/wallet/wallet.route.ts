import { Hono } from 'hono';
import { auth } from '../../middlewares/auth.middleware';
import { makeDemoWallet, makeRealWallet, wallet } from './wallet.controller';

export const walletRouter = new Hono();

// demo wallet
walletRouter.post('/', auth, makeDemoWallet);

walletRouter.post('/', auth, makeRealWallet);

// get wallet by type
walletRouter.get('/:type', auth, wallet);
