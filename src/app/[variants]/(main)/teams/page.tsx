'use client';

import { memo } from 'react';

import RocketChatEmbed from './features/RocketChatEmbed';

const TeamsPage = memo(() => {
  return <RocketChatEmbed />;
});

TeamsPage.displayName = 'TeamsPage';

export default TeamsPage;

