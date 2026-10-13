import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/format';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  gold: 'btn-gold',
  danger: 'btn-danger',
  'danger-ghost': 'btn-danger-ghost',
};

const SIZES = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg', icon: 'btn-icon' };

/**
 * <Button variant="primary" size="md" icon={Plus} loading to="/x" href="https://…">
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    disabled,
    to,
    href,
    className,
    children,
    type = 'button',
    block = false,
    ...props
  },
  ref,
) {
  const classes = cn('btn', VARIANTS[variant], SIZES[size], block && 'w-full', className);
  const content = (
    <>
      {loading ? (
        <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} aria-hidden />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight className="w-4 h-4" aria-hidden />}
    </>
  );

  if (to && !disabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
});

export default Button;
