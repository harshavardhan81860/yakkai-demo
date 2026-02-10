import { Link } from "react-router-dom";
import "../../styles/breadcrumbs.css";

export interface BreadcrumbItem {
  label: string;
  path?: string; // if path exists → clickable
}

interface Props {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: Props) => {
  return (
    <nav className="breadcrumbs">
      {items.map((item, index) => (
        <span key={index}>
          {item.path ? (
            <Link to={item.path}>{item.label}</Link>
          ) : (
            <span className="current">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="sep">›</span>}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
