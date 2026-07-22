import { STUDIO_VERSION } from "@/core/platform/version";

export function BrandLogo() {
  return (
    <div className="brandLogo" aria-label={`AL Green Design Studio ${STUDIO_VERSION}`}>
      <div className="brandLeaf">◒</div>
      <div>
        <strong>AL Green Design</strong>
        <span>Professional CAD · Studio {STUDIO_VERSION}</span>
      </div>
    </div>
  );
}
