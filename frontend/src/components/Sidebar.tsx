import { NavLink, useNavigate } from "react-router-dom";
import { LinkIcon, SettingsIcon } from "./icons";
import { clearSession } from "../lib/auth";

const navItems = [
  { to: "/", label: "Meus links", icon: LinkIcon, end: true },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-5 font-bold text-[15px]">
        <LinkIcon className="h-[18px] w-[18px] text-accent" />
        <span>Tracer</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium ${
                isActive
                  ? "bg-accent-soft font-semibold text-accent"
                  : "text-text-secondary hover:bg-zinc-100 hover:text-text"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <UserRow />
    </aside>
  );
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function UserRow() {
  const navigate = useNavigate();
  const rawUser = localStorage.getItem("tracer_user");
  const user = rawUser ? (JSON.parse(rawUser) as { nome: string; email: string }) : null;

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5 border-t border-border px-4 py-3.5">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
        {initials(user.nome)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{user.nome}</div>
        <div className="truncate text-[11.5px] text-text-secondary">{user.email}</div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-zinc-100 hover:text-text"
      >
        Sair
      </button>
    </div>
  );
}
