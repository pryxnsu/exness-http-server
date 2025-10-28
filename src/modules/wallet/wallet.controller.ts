import { Context } from 'hono';
import { createWallet, getWallet } from '../../lib/db/queries/wallet.queries';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { User } from '../../lib/db/schema';

// create demo wallet
export const makeDemoWallet = async (c: Context) => {
    const user = c.get('user') as User;

    // check wallet already exists
    const isWalletExist = await getWallet(user?.id as string, 'demo');
    if (isWalletExist) {
        throw new HTTPException(HTTP_RESPONSE_CODE.CONFLICT, {
            message: 'Wallet already exist',
        });
    }

    const newWallet = await createWallet(user.id, {
        type: 'demo',
    });

    return c.json({ success: true, message: 'Wallet created successfully', data: newWallet });
};

// create real wallet
export const makeRealWallet = async (c: Context) => {
    const user = c.get('user') as User;

    // check wallet already exists
    const isWalletExist = await getWallet(user?.id as string, 'real');
    if (isWalletExist) {
        throw new HTTPException(HTTP_RESPONSE_CODE.CONFLICT, {
            message: 'Wallet already exist',
        });
    }

    // TODO: Check KYC and balance logic

    const newWallet = await createWallet(user.id, {
        type: 'real',
    });

    return c.json({ success: true, message: 'Wallet created successfully', data: newWallet });
};

export const wallet = async (c: Context) => {
    const user = c.get('user') as User;
    const walletType = c.req.param('type') as 'real' | 'demo';

    if (walletType !== 'real' && walletType !== 'demo') {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Invalid wallet type',
        });
    }

    const wallet = await getWallet(user.id, walletType);
    if (walletType == 'real' && !wallet) {
        throw new HTTPException(HTTP_RESPONSE_CODE.NOT_FOUND, {
            message: 'No real wallet found. Please make one',
        });
    }

    return c.json({ success: true, message: 'Wallet fetch successfully', data: wallet });
};
