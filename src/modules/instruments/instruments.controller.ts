import { Context } from 'hono';
import {
    createFavoriteInstrument,
    destroyInstrument,
    getFavoriteInstrumentsByUserId,
} from '../../lib/db/queries/instrument.queries';
import { HTTP_RESPONSE_CODE } from '../../constant';

export const addInstrument = async (c: Context) => {
    // @ts-ignore
    const body = c.req.valid('json');
    const user = c.get('user');
    const instrument = await createFavoriteInstrument(
        user?.id as string,
        body['symbol'],
        body['sortOrder']
    );

    return c.json(
        { success: true, message: 'Instrument added successfully', data: instrument },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const favoriteInstrument = (c: Context) => {
    const user = c.get('user');
    const instruments = getFavoriteInstrumentsByUserId(user?.id as string);

    return c.json(
        { success: true, message: 'Favorite Instruments fetch successfully', data: instruments },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const removeInstrumentFromFavorite = async (c: Context) => {
    const user = c.get('user');
    const instrumentId = c.req.param('id');
    const instrumentsId: { id: string } = await destroyInstrument(user?.id as string, instrumentId);
    return c.json(
        { success: true, message: 'Instruments removed successfully', data: instrumentsId },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};
