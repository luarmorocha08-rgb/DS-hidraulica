import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-heading text-[0.95rem] font-bold tracking-wide text-silver">
      {children}
      {optional && <span className="ml-1.5 font-sans text-xs font-normal text-silver-dim">(opcional)</span>}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-[#ff8f92]">
      {message}
    </p>
  );
}

interface BaseProps {
  name: string;
  label: string;
  error?: string;
  optional?: boolean;
  hint?: ReactNode;
  className?: string;
}

export function TextField({
  name,
  label,
  error,
  optional,
  hint,
  className,
  ...props
}: BaseProps & Omit<ComponentProps<"input">, "name">) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <input
        id={id}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        required={!optional}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-silver-dim">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  error,
  optional,
  hint,
  className,
  ...props
}: BaseProps & Omit<ComponentProps<"textarea">, "name">) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <textarea
        id={id}
        name={name}
        rows={4}
        className="field resize-y"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        required={!optional}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-silver-dim">{hint}</p>}
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  error,
  optional,
  className,
  options,
  placeholder,
  ...props
}: BaseProps &
  Omit<ComponentProps<"select">, "name"> & {
    options: ReadonlyArray<{ value: string; label: string }>;
    placeholder?: string;
  }) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <select
        id={id}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        required={!optional}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function Checkbox({
  name,
  children,
  error,
  className,
  ...props
}: { name: string; children: ReactNode; error?: string; className?: string } & Omit<ComponentProps<"input">, "name">) {
  const id = props.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-silver">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[#f47712]"
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <span>{children}</span>
      </label>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "success" | "warning" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-[10px] border px-4 py-3 text-sm",
        tone === "danger" && "border-danger/40 bg-danger/10 text-[#ffb3b5]",
        tone === "success" && "border-success/40 bg-success/10 text-[#9be3c1]",
        tone === "warning" && "border-warning/40 bg-warning/10 text-[#ffd98a]",
        tone === "info" && "border-info/40 bg-info/10 text-[#b5dcff]",
      )}
    >
      {children}
    </div>
  );
}
