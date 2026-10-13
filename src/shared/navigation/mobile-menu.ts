/** Returns whether an in-page anchor navigation should close the mobile menu. */
export function shouldCloseMobileMenuOnAnchorClick(
  isMenuOpen: boolean,
  href: string,
): boolean {
  return isMenuOpen && href.startsWith("#") && href.length > 1;
}
