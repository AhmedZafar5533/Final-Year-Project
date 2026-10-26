const PageHeader = ({ title, description, eyebrow, actions, children }) => (
  <header className="page-header">
    <div className="min-w-0">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
      {children}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);

export default PageHeader;
