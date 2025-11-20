import z from 'zod';

export const CreateOrderSchema = z.object({
    instrument: z.string().nonempty({ message: 'Instrument can be empty' }),
    oneClick: z.boolean(),
    price: z.number().nonnegative(),
    sl: z.number().nonnegative(),
    tp: z.number().nonnegative(),
    type: z.number().nonnegative(),
    volume: z.number().nonnegative(),
});

export const ClosePositionSchema = z.object({
    price: z.number().nonnegative(),
    volume: z.number().nonnegative(),
    closeById: z.number().nonnegative(),
});
