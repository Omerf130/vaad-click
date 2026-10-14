import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const shellScss = readFileSync(
  join(process.cwd(), "src", "modules", "admin", "layout", "AdminShell.module.scss"),
  "utf8",
);

const shellTsx = readFileSync(
  join(process.cwd(), "src", "modules", "admin", "layout", "AdminShell.tsx"),
  "utf8",
);

describe("admin shell desktop grid layout", () => {
  it("forces LTR grid placement on an RTL document (html dir=rtl)", () => {
    expect(shellScss).toMatch(/\.shell[\s\S]*direction:\s*ltr/);
    expect(shellScss).toMatch(/grid-template-areas:\s*"main sidebar"/);
    expect(shellScss).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*\$admin-sidebar-fixed-width/);
  });

  it("pins main to column 1 and sidebar to column 2 with fixed ~280px width", () => {
    expect(shellScss).toMatch(/\.mainColumn[\s\S]*grid-column:\s*1/);
    expect(shellScss).toMatch(/\.sidebar[\s\S]*grid-column:\s*2/);
    expect(shellScss).toMatch(/\$admin-sidebar-fixed-width:\s*280px/);
  });

  it("keeps Hebrew UI RTL inside main and sidebar only", () => {
    expect(shellScss).toMatch(/\.mainColumn[\s\S]*direction:\s*rtl/);
    expect(shellScss).toMatch(/\.sidebar[\s\S]*direction:\s*rtl/);
    expect(shellTsx).not.toMatch(/dir="rtl"/);
  });

  it("places main column before sidebar in DOM", () => {
    const mainIndex = shellTsx.indexOf("mainColumn");
    const sidebarIndex = shellTsx.indexOf("<AdminSidebar");
    expect(mainIndex).toBeLessThan(sidebarIndex);
  });

  it("does not use row-reverse or RTL on the grid shell", () => {
    expect(shellScss).not.toMatch(/row-reverse/);
  });
});
