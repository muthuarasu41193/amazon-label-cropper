type PlatformLogoProps = {
  id: string;
  className?: string;
};

export function PlatformLogo({ id, className = "h-8 w-8" }: PlatformLogoProps) {
  switch (id) {
    case "amazon":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#232f3e" />
          <path
            d="M12 30c8 4 16 4 24 0"
            stroke="#ff9900"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M33 26l4 4-4 4" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case "ebay":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#fff" />
          <text x="6" y="32" fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif">
            <tspan fill="#e53238">e</tspan>
            <tspan fill="#0064d2">b</tspan>
            <tspan fill="#f5af02">a</tspan>
            <tspan fill="#86b817">y</tspan>
          </text>
        </svg>
      );
    case "shopify":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#95bf47" />
          <path
            d="M24 10c-1 0-2 .5-2.5 1.5L18 22h12L26.5 11.5C26 10.5 25 10 24 10zm-8 14v12c0 2 1.5 3.5 3.5 3.5h13c2 0 3.5-1.5 3.5-3.5V24H16z"
            fill="#fff"
          />
        </svg>
      );
    case "woocommerce":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#7f54b3" />
          <text x="10" y="33" fill="#fff" fontSize="24" fontWeight="800" fontFamily="system-ui, sans-serif">
            W
          </text>
        </svg>
      );
    case "etsy":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#f1641e" />
          <text x="13" y="33" fill="#fff" fontSize="24" fontWeight="800" fontFamily="Georgia, serif">
            E
          </text>
        </svg>
      );
    case "flipkart":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#2874f0" />
          <path d="M14 32l10-16 10 16H14z" fill="#ffe500" />
          <circle cx="34" cy="16" r="3" fill="#ffe500" />
        </svg>
      );
    case "meesho":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#9f2089" />
          <text x="11" y="33" fill="#fff" fontSize="24" fontWeight="800" fontFamily="system-ui, sans-serif">
            M
          </text>
        </svg>
      );
    case "fedex":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#4d148c" />
          <text x="7" y="30" fill="#fff" fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif">
            Fed
          </text>
          <text x="22" y="30" fill="#ff6600" fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif">
            Ex
          </text>
        </svg>
      );
    case "ups":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#351c15" />
          <path d="M24 10l12 6v10c0 8-5 14-12 16-7-2-12-8-12-16V16l12-6z" fill="#ffb500" />
          <text x="17" y="30" fill="#351c15" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">
            UPS
          </text>
        </svg>
      );
    case "dhl":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#ffcc00" />
          <rect x="6" y="18" width="36" height="12" rx="2" fill="#d40511" />
          <text x="11" y="27" fill="#fff" fontSize="11" fontWeight="800" fontFamily="system-ui, sans-serif">
            DHL
          </text>
        </svg>
      );
    case "usps":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#004b87" />
          <rect x="8" y="14" width="32" height="20" rx="2" fill="#fff" />
          <text x="11" y="28" fill="#004b87" fontSize="11" fontWeight="800" fontFamily="system-ui, sans-serif">
            USPS
          </text>
        </svg>
      );
    case "generic":
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#14b8a6" />
          <path
            d="M16 14h16a2 2 0 012 2v20l-10-6-10 6V16a2 2 0 012-2z"
            fill="#fff"
            opacity="0.95"
          />
          <text x="20" y="27" fill="#14b8a6" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif">
            PDF
          </text>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#e5e7eb" />
          <text x="16" y="31" fill="#6b7280" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">
            ?
          </text>
        </svg>
      );
  }
}
