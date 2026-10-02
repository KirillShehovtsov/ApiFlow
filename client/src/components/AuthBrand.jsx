import { useId } from 'react';

// Компактный знак над формой входа / регистрации
export default function AuthBrand() {
  const gradId = useId().replace(/:/g, '');

  return (
    <div className="auth-brand" aria-hidden="true">
      <svg className="auth-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="32" height="32" rx="10" fill={`url(#abg-${gradId})`} stroke="rgba(134,112,255,0.55)" strokeWidth="1" />
        <path
          d="M12 20h10l-3-6 8 8-8 8 3-6H12v-4z"
          fill="rgba(255,255,255,0.96)"
        />
        <defs>
          <linearGradient id={`abg-${gradId}`} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9a7cff" />
            <stop offset="0.45" stopColor="#6d4ad4" />
            <stop offset="1" stopColor="#4b2ea3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
