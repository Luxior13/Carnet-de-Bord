import { faDiscord } from '@fortawesome/free-brands-svg-icons/faDiscord';
import { faFacebookF } from '@fortawesome/free-brands-svg-icons/faFacebookF';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
import { faLinkedinIn } from '@fortawesome/free-brands-svg-icons/faLinkedinIn';
import { faTiktok } from '@fortawesome/free-brands-svg-icons/faTiktok';
import { faTwitch } from '@fortawesome/free-brands-svg-icons/faTwitch';
import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons/faXTwitter';
import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import { Globe2 } from 'lucide-react';
import React, { type FC } from 'react';

const SOCIAL_NETWORK_ICONS = new Map([
  ['discord', faDiscord],
  ['instagram', faInstagram],
  ['x', faXTwitter],
  ['twitter', faTwitter],
  ['tiktok', faTiktok],
  ['twitch', faTwitch],
  ['youtube', faYoutube],
  ['facebook', faFacebookF],
  ['linkedin', faLinkedinIn],
]);

type PersonSocialNetworkIconProps = {
  className?: string;
  networkKey: string;
};

/**
 * Centralise les marques prises en charge. Les icônes restent monochromes et
 * héritent du thème ; une clé future ou historique conserve un fallback lisible.
 */
export const PersonSocialNetworkIcon: FC<PersonSocialNetworkIconProps> = ({
  className,
  networkKey,
}) => {
  const definition = SOCIAL_NETWORK_ICONS.get(networkKey.trim().toLowerCase());

  if (!definition) {
    return (
      <Globe2 aria-hidden="true" className={className} focusable="false" />
    );
  }

  const [width, height, , , pathData] = definition.icon;
  const paths = Array.isArray(pathData) ? pathData : [pathData];

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
};
