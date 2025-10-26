/**
 * handle user oauth
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { setCookie } from 'hono/cookie';
import { google } from 'googleapis';
import { env } from '../../env';
import { HTTP_RESPONSE_CODE, TIME } from '../../constant';
import { db } from '../../lib/db';
import { User } from '../../lib/db/schema';
import { createUser, getUserByEmail } from '../../lib/db/queries/auth.queries';
import { generateAccessAndRefreshToken, userReqInfo } from './auth.service';
import { createSession } from '../../lib/db/queries/session.queries';
import { createAccount, getAccountById } from '../../lib/db/queries/account.queries';

const oauth2Client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    `${env.serverUrl}/auth/callback/google`
);

export const googleLogin = (c: Context) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['profile', 'email'],
    });
    return c.redirect(url);
};

export const googleCallback = async (c: Context) => {
    const code = c.req.query('code');
    if (!code) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Please try again.',
        });
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.id_token || !tokens.access_token) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Invalid token response',
        });
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });

    const { data } = await oauth2.userinfo.get();

    const { id, email, verified_email, name, picture } = data;

    if (!id || !email || !verified_email || !name) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Login failed. Please try again',
        });
    }

    let user: User | null = null;

    const account = await getAccountById(id);
    if (account) {
        // user account already exist -> login
        user = await getUserByEmail(email);
    } else {
        // user account doesn't exist -> signup
        user = await db.transaction(async (tx: any) => {
            const newUser = await createUser({
                tx,
                name: name,
                email: email,
                emailVerified: verified_email,
                role: 'user',
                avatar: picture || '',
            });

            await createAccount({
                tx,
                userId: newUser?.id as string,
                providerId: 'google',
                accountId: id as string,
                idToken: tokens.id_token as string,
                accessToken: tokens.access_token as string,
                refreshToken: tokens.refresh_token as string,
                accessTokenExpiresAt: new Date(tokens.expiry_date as number),
                refreshTokenExpiresAt: new Date(tokens.expiry_date as number),
                scope: tokens.scope as string,
            });
            return newUser;
        });
    }

    if (!user) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Something went wrong while login. Please try again',
        });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user as User);

    // get ip address and user agent
    const { ipAddress, userAgent } = userReqInfo(c);

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 1);

    await createSession(user.id, accessToken, ipAddress, userAgent, expireDate);

    setCookie(c, env.accessTokenName, accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: TIME.ONE_DAY,
    });

    setCookie(c, env.refreshTokenName, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: TIME.SEVEN_DAYS,
    });

    return c.redirect(`${env.clientUrl}/webtrading`);
};
