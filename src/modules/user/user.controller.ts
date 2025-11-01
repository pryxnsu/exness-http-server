import { Context } from 'hono';
import { User } from '../../lib/db/schema';

export const getUser = async (c: Context) => {
    const user = c.get('user') as User;

    let _user;
    if (user) {
        const { role, ...updatedUser } = user;
        _user = updatedUser;
    }

    return c.json({
        user: _user,
    });
};
