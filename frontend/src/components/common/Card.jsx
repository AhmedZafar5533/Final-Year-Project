const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className = "",
  bodyClassName = "",
  noPadding = false,
  hoverable = false,
  bordered = false,
  ...props
}) => {
  return (
    <div
      className={`
        bg-surface-50 dark:bg-dark-surface rounded-xl
        ${bordered ? "border border-surface-300 dark:border-dark-border" : "shadow-sm border border-surface-200 dark:border-dark-border"}
        ${hoverable ? "hover:shadow-lg dark:hover:shadow-black/30 transition-shadow duration-200" : ""}
        ${className}
      `}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-surface-200 dark:border-dark-border">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base sm:text-lg font-semibold text-text-primary dark:text-dark-text">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex items-center gap-2 flex-shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      <div className={`${noPadding ? "" : "p-4 sm:p-6"} ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-4 sm:px-6 py-4 border-t border-surface-200 dark:border-dark-border bg-surface-100 dark:bg-dark-surface-light rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
