import { z } from 'zod';

export const AddFavoriteInstrumentSchema = z.object({
    symbol: z.string().nonempty({ message: 'Symbol is required' }),
    sortOrder: z.number().positive(),
});

export type AddFavoriteInstrumentType = z.infer<typeof AddFavoriteInstrumentSchema>;
