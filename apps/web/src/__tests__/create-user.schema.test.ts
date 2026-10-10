import { describe, expect, it } from 'vitest';

import {
  createUserSchema,
  EMPTY_USER_FORM,
  getCreationFieldErrors,
} from '$features/users/create-user.schema';

const validForm = {
  ...EMPTY_USER_FORM,
  firstName: ' Jean ',
  loginName: ' Jean.Dupont ',
};

describe('shared user creation validation', () => {
  it('accepts an omitted contact and blank last name, and normalizes identity', () => {
    expect(createUserSchema.parse(validForm)).toEqual({
      contactEmail: null,
      firstName: 'Jean',
      lastName: '',
      loginName: 'jean.dupont',
      role: 'USER',
    });
  });

  it.each(['a..b@example.test', 'a@', '.a@example.test'])(
    'rejects malformed contact %s on both sides',
    (contactEmail) => {
      const result = createUserSchema.safeParse({ ...validForm, contactEmail });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          getCreationFieldErrors(result.error.flatten().fieldErrors),
        ).toEqual({ contactEmail: 'Email invalide' });
    },
  );

  it.each([
    { firstName: '   ' },
    { lastName: 'a'.repeat(51) },
    { loginName: 'x' },
    { role: 'SUPERADMIN' },
    { isProtected: true },
  ])('rejects invalid or privileged creation input %j', (change) => {
    expect(
      createUserSchema.safeParse({ ...validForm, ...change }).success,
    ).toBe(false);
  });

  it('normalizes a valid contact address', () => {
    expect(
      createUserSchema.parse({
        ...validForm,
        contactEmail: ' Jean@Example.test ',
      }).contactEmail,
    ).toBe('jean@example.test');
  });

  it('only maps known fields and string messages from a server response', () => {
    expect(
      getCreationFieldErrors(
        JSON.parse(
          '{"loginName":["Déjà utilisé","Autre message"],"firstName":[2],"lastName":"invalid shape","permissions":["private"],"__proto__":["pollution"]}',
        ),
      ),
    ).toEqual({ loginName: 'Déjà utilisé' });
    expect(getCreationFieldErrors()).toEqual({});
  });
});
