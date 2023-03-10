import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import type { ForwardedRef } from 'preact/compat';
import { forwardRef } from 'preact/compat';
import { Icon } from './Icon';

const colorStyles = {
  custom: '',
  default: 'text-gray-700 enabled:hover:bg-gray-700/10 enabled:hover:text-gray-1000',
  gray: 'text-gray-800 bg-gray-100 enabled:hover:bg-gray-500/20 enabled:hover:text-gray-1000',
  primary: 'bg-blue-400 text-white hover:bg-blue-500',
  secondary: 'bg-violet-400 text-white hover:bg-violet-500',
  warning: 'bg-orange-400 text-white hover:bg-orange-500',
  danger: 'bg-red-400 text-white hover:bg-red-500',
};

export type ButtonProps = {
  color?: keyof typeof colorStyles;
  size?: 'sm' | 'md';
  justify?: 'start' | 'center';
  type?: 'button' | 'submit';
  onClick?: (event: MouseEvent) => void;
  forDropdown?: boolean;
  className?: string;
  children?: ComponentChildren;
  disabled?: boolean;
  title?: string;
  tabIndex?: number;
};

export const Button = forwardRef(function Button(
  {
    className,
    children,
    forDropdown,
    color,
    justify = 'center',
    size = 'md',
    ...props
  }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      className={classnames(
        className,
        'outline-none',
        'border border-transparent focus-visible:border-blue-300',
        'transition-all rounded-md flex items-center',
        colorStyles[color || 'default'],
        justify === 'start' && 'justify-start',
        justify === 'center' && 'justify-center',
        size === 'md' && 'h-9 px-3',
        size === 'sm' && 'h-7 px-2.5 text-sm',
      )}
      {...props}
    >
      {children}
      {forDropdown && <Icon icon="triangleDown" className="ml-1 -mr-1" />}
    </button>
  );
});
