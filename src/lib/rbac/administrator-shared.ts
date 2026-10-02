/** Pure helpers — safe for Client Components. */

export function isAdministratorRoleName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase() === "administrator";
}
