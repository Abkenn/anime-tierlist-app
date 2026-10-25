'use client';

import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';

type FormSubmitButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  pendingLabel?: string;
};

export const FormSubmitButton = ({
  children,
  disabled,
  pendingLabel,
  ...props
}: FormSubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
};
