import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Home from '../../assets/figma/a50fe.svg';
import Lightbulb from '../../assets/figma/03051.svg';
import Profile from '../../assets/figma/bb5a4.svg';
import Arrow from '../../assets/figma/6e3a8.svg';
import Mail from '../../assets/phosphor/mail.svg';
import Flight from '../../assets/phosphor/flight.svg';
import Gym from '../../assets/phosphor/gym.svg';
import Video from '../../assets/phosphor/video.svg';
import News from '../../assets/phosphor/news.svg';
import Brief from '../../assets/phosphor/brief.svg';
import Calendar from '../../assets/phosphor/calendar.svg';
import DateIcon from '../../assets/phosphor/date.svg';
import General from '../../assets/phosphor/general.svg';
import Greeting from '../../assets/phosphor/greeting.svg';
import type { AgentIcon } from '../data/types';

export type IconName = AgentIcon | 'marketplace' | 'home' | 'suggestions' | 'profile' | 'send' | 'stop';
const icons = { general: General, home: Home, suggestions: Lightbulb, profile: Profile, send: Arrow,
  mail: Mail, flight: Flight, gym: Gym, video: Video, news: News, brief: Brief,
  calendar: Calendar, date: DateIcon, greeting: Greeting };
export function Icon({ name, color = '#ffffff', size = 22 }: { name: IconName; color?: string; size?: number }) {
  if (name === 'marketplace') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 9v11h16V9M3 9l2-6h14l2 6M3 9c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 20v-6h6v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  // Match the send asset's viewBox and circle exactly; replace only its arrow.
  if (name === 'stop') return <Svg width={size} height={size} viewBox="0 0 36 36"><Circle cx={18} cy={18} r={14.625} fill="#DCDCDC" /><Rect x={13} y={13} width={10} height={10} rx={1} fill="#1b1b1b" /></Svg>;
  const Component = icons[name] ?? News;
  return <Component width={size} height={size} color={color} />;
}
