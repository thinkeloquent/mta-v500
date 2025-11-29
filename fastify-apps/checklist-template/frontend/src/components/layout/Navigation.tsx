import { Link, NavLink } from "react-router-dom";
import { buttonClasses } from "../ui/Button";

export function Navigation() {
  return (
    <header className="relative mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between gap-8 rounded-lg border border-neutral-200 bg-white px-6 py-3 shadow-sm">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-neutral-900 transition hover:text-neutral-700"
        >
          <span className="inline-flex size-2 rounded-full bg-emerald-500" />
          Checklist Studio
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              buttonClasses({
                size: "sm",
                variant: isActive ? "secondary" : "ghost",
              })
            }
          >
            Templates
          </NavLink>
          <NavLink
            to="/checklists"
            className={({ isActive }) =>
              buttonClasses({
                size: "sm",
                variant: isActive ? "secondary" : "ghost",
              })
            }
          >
            Checklists
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
