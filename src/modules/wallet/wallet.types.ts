import z from 'zod';

export const CreateWalletSchema = z.object({
    type: z.enum(['real', 'demo']),
});

export type CreateWalletType = z.infer<typeof CreateWalletSchema>;
