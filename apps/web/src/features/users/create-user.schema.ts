import { z } from 'zod';

import {
  loginNameSchema,
  optionalEmailSchema,
  trimmedStringMinMax,
} from '$utils/zod.utils';

export const createUserSchema = z
  .object({
    contactEmail: optionalEmailSchema,
    firstName: trimmedStringMinMax(
      1,
      50,
      'Prénom obligatoire',
      'Prénom trop long',
    ),
    lastName: trimmedStringMinMax(0, 50, undefined, 'Nom trop long'),
    loginName: loginNameSchema,
    role: z.enum(['ADMIN', 'USER']),
  })
  .strict();

export type NewUserForm = {
  contactEmail: string;
  firstName: string;
  lastName: string;
  loginName: string;
  role: 'ADMIN' | 'USER';
};
export type NewUserFormErrors = Partial<Record<keyof NewUserForm, string>>;
export const EMPTY_USER_FORM: NewUserForm = {
  contactEmail: '',
  firstName: '',
  lastName: '',
  loginName: '',
  role: 'USER',
};

export const getCreationFieldErrors = (
  details?: Record<string, string[]>,
): NewUserFormErrors => {
  const result: NewUserFormErrors = {};
  for (const field of [
    'contactEmail',
    'firstName',
    'lastName',
    'loginName',
    'role',
  ] as const) {
    // Only these fixed form fields may receive server validation messages.
    // eslint-disable-next-line security/detect-object-injection
    const messages = details?.[field];
    if (Array.isArray(messages) && typeof messages[0] === 'string')
      // eslint-disable-next-line security/detect-object-injection
      result[field] = messages[0];
  }

  return result;
};
