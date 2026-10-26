import { IoChevronDown } from "react-icons/io5";

const Disclosure = ({ title, description, children, defaultOpen = false, className = "" }) => (
  <details className={`app-disclosure ${className}`} open={defaultOpen || undefined}>
    <summary>
      <span className="min-w-0">
        <span className="disclosure-title">{title}</span>
        {description && <span className="disclosure-description">{description}</span>}
      </span>
      <IoChevronDown className="disclosure-chevron" aria-hidden="true" />
    </summary>
    <div className="disclosure-content">{children}</div>
  </details>
);

export default Disclosure;
