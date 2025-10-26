import { Context } from 'hono';
import { sign } from 'hono/jwt';
import { User } from '../../lib/db/schema';
import { env } from '../../env';
import { TIME } from '../../constant';

async function generateAccessAndRefreshToken(
    user: User
): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await sign(
        { user, exp: Math.floor(Date.now() / 1000) + TIME.ONE_DAY },
        env.jwtSecret
    );
    const refreshToken = await sign(
        { id: user.id, exp: Math.floor(Date.now() / 1000) + TIME.SEVEN_DAYS },
        env.jwtSecret
    );

    return {
        accessToken,
        refreshToken,
    };
}

function userReqInfo(c: Context): { userAgent: string; ipAddress: string } {
    const userAgent = c.req.header('user-agent') as string;
    const ipAddress =
        c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
        c.req.header('x-real-ip') ||
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-client-ip') ||
        'unknown';

    return {
        userAgent,
        ipAddress,
    };
}

export { generateAccessAndRefreshToken, userReqInfo };
