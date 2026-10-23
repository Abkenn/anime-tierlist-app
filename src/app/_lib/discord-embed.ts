import {
  Container,
  h,
  LinkButton,
  Section,
  Separator,
  TextDisplay,
  toComponentEmbedJson,
} from 'discord-component-embed';
import { siteAccent, siteUrl } from './site-metadata';

export const discordEmbedJson = toComponentEmbedJson(
  h(
    Container,
    { accentColor: Number.parseInt(siteAccent.slice(1), 16) },
    h(
      Section,
      {
        accessory: h(LinkButton, {
          label: 'Create a tierlist',
          url: siteUrl.href,
        }),
      },
      h(TextDisplay, null, 'Anime Tierlist'),
    ),
    h(Separator, { spacing: 'small' }),
    h(
      TextDisplay,
      null,
      '**Find your anime. Make your tierlist.**\nSearch for posters or bring your own image from a URL. Edit your image on the spot and add your own title.',
    ),
  ),
);
